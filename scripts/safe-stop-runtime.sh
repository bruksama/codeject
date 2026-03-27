#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SELF_PID="$$"
SELF_PGID="$(ps -o pgid= -p "$SELF_PID" 2>/dev/null | tr -d ' ')"
PORTS=(3500 4028)
WAIT_SECONDS=6
POLL_INTERVAL_SECONDS="0.2"

# Process-group targets discovered from repo npm runtimes and repo listeners.
declare -A TARGET_PGIDS=()

log() {
  printf '[safe-stop] %s\n' "$*"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

has_listener_discovery_tool() {
  command_exists lsof || command_exists ss
}

pid_to_pgid() {
  local pid="$1"
  ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' '
}

pid_to_cwd() {
  local pid="$1"
  local proc_cwd
  proc_cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
  if [[ -n "$proc_cwd" ]]; then
    printf '%s\n' "$proc_cwd"
    return
  fi

  ps -o cwd= -p "$pid" 2>/dev/null | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

pid_to_args() {
  local pid="$1"
  ps -o args= -p "$pid" 2>/dev/null
}

path_is_repo_scoped() {
  local path_value="$1"
  [[ "$path_value" == "$REPO_ROOT" || "$path_value" == "$REPO_ROOT"/* ]]
}

pid_is_repo_scoped() {
  local pid="$1"
  local cwd
  cwd="$(pid_to_cwd "$pid")"
  if [[ -n "$cwd" && "$cwd" != "-" ]] && path_is_repo_scoped "$cwd"; then
    return 0
  fi

  local args
  args="$(pid_to_args "$pid")"
  [[ "$args" == *"$REPO_ROOT/"* || "$args" == *"$REPO_ROOT "* || "$args" == *"$REPO_ROOT" ]]
}

group_alive() {
  local pgid="$1"
  pgrep -g "$pgid" >/dev/null 2>&1
}

add_target_pgid() {
  local pgid="$1"
  [[ "$pgid" =~ ^[0-9]+$ ]] || return
  [[ "$pgid" == "$SELF_PGID" ]] && return
  TARGET_PGIDS["$pgid"]=1
}

collect_repo_npm_pgids() {
  local pid
  local pgid
  local args

  while IFS= read -r pid; do
    [[ -n "$pid" ]] || continue
    [[ "$pid" == "$SELF_PID" ]] && continue

    args="$(pid_to_args "$pid")"
    [[ "$args" == *"safe-stop-runtime.sh"* || "$args" == *"npm run safe-stop"* ]] && continue

    if pid_is_repo_scoped "$pid"; then
      pgid="$(pid_to_pgid "$pid")"
      [[ -n "$pgid" ]] && printf '%s\n' "$pgid"
    fi
  done < <(ps -eo pid=,args= | awk '/(^|[[:space:]])([^[:space:]]*\/)?npm([[:space:]]|$)/ { print $1 }')
}

list_listener_pids() {
  local port="$1"

  if command_exists lsof; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null | sort -u
    return
  fi

  if command_exists ss; then
    ss -ltnp "sport = :$port" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u
    return
  fi
}

collect_target_pgids() {
  local pgid
  while IFS= read -r pgid; do
    [[ -n "$pgid" ]] && add_target_pgid "$pgid"
  done < <(collect_repo_npm_pgids | sort -u)

  if ! has_listener_discovery_tool; then
    return
  fi

  local port
  local pid
  for port in "${PORTS[@]}"; do
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue
      if pid_is_repo_scoped "$pid"; then
        pgid="$(pid_to_pgid "$pid")"
        [[ -n "$pgid" ]] && add_target_pgid "$pgid"
      fi
    done < <(list_listener_pids "$port")
  done
}

prune_dead_target_pgids() {
  local pgid
  for pgid in "${!TARGET_PGIDS[@]}"; do
    if ! group_alive "$pgid"; then
      unset 'TARGET_PGIDS[$pgid]'
    fi
  done
}

send_signal_to_target_pgids() {
  local signal="$1"
  local pgid

  for pgid in "${!TARGET_PGIDS[@]}"; do
    kill "-$signal" "-$pgid" 2>/dev/null || true
  done
}

wait_for_target_pgids_exit() {
  local deadline=$((SECONDS + WAIT_SECONDS))

  while (( SECONDS < deadline )); do
    prune_dead_target_pgids
    if [[ ${#TARGET_PGIDS[@]} -eq 0 ]]; then
      return 0
    fi
    sleep "$POLL_INTERVAL_SECONDS"
  done

  prune_dead_target_pgids
  [[ ${#TARGET_PGIDS[@]} -eq 0 ]]
}

kill_codeject_tmux_sessions() {
  if ! command_exists tmux; then
    log "tmux not found; skipping tmux session cleanup"
    return 0
  fi

  local sessions=()
  mapfile -t sessions < <(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^codeject-' || true)

  if [[ ${#sessions[@]} -eq 0 ]]; then
    log "No codeject tmux sessions found"
    return 0
  fi

  log "Killing ${#sessions[@]} codeject tmux session(s)"
  local session
  for session in "${sessions[@]}"; do
    tmux kill-session -t "$session" 2>/dev/null || true
  done

  local remaining=()
  mapfile -t remaining < <(tmux list-sessions -F '#{session_name}' 2>/dev/null | grep '^codeject-' || true)
  if [[ ${#remaining[@]} -gt 0 ]]; then
    log "Failed to remove all codeject tmux sessions: ${remaining[*]}"
    return 1
  fi

  log "tmux session cleanup complete"
  return 0
}

verify_repo_listeners_cleared() {
  if ! has_listener_discovery_tool; then
    log "Cannot verify listener state: neither lsof nor ss is available"
    return 1
  fi

  local failed=0
  local port
  local pid

  for port in "${PORTS[@]}"; do
    local scoped_pids=()
    while IFS= read -r pid; do
      [[ -n "$pid" ]] || continue
      if pid_is_repo_scoped "$pid"; then
        scoped_pids+=("$pid")
      fi
    done < <(list_listener_pids "$port")

    if [[ ${#scoped_pids[@]} -gt 0 ]]; then
      failed=1
      log "Port $port still has repo listener PID(s): ${scoped_pids[*]}"
    fi
  done

  if [[ "$failed" -eq 1 ]]; then
    return 1
  fi

  log "No repo listeners remain on ports ${PORTS[*]}"
  return 0
}

main() {
  local failed=0

  collect_target_pgids
  prune_dead_target_pgids

  if [[ ${#TARGET_PGIDS[@]} -gt 0 ]]; then
    log "Stopping ${#TARGET_PGIDS[@]} repo process group(s): ${!TARGET_PGIDS[*]}"

    log "Sending SIGINT"
    send_signal_to_target_pgids INT
    wait_for_target_pgids_exit || true

    if [[ ${#TARGET_PGIDS[@]} -gt 0 ]]; then
      log "Still running after SIGINT; sending SIGTERM"
      send_signal_to_target_pgids TERM
      wait_for_target_pgids_exit || true
    fi

    if [[ ${#TARGET_PGIDS[@]} -gt 0 ]]; then
      log "Still running after SIGTERM; sending SIGKILL"
      send_signal_to_target_pgids KILL
      wait_for_target_pgids_exit || true
    fi

    if [[ ${#TARGET_PGIDS[@]} -gt 0 ]]; then
      failed=1
      log "Some process groups survived escalation: ${!TARGET_PGIDS[*]}"
    else
      log "All target process groups stopped"
    fi
  else
    log "No repo npm runtime process groups found"
  fi

  if ! kill_codeject_tmux_sessions; then
    failed=1
  fi

  if ! verify_repo_listeners_cleared; then
    failed=1
  fi

  if [[ "$failed" -eq 1 ]]; then
    log "safe-stop finished with cleanup failures"
    exit 1
  fi

  log "safe-stop complete"
}

main "$@"
