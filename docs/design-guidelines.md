# Hướng dẫn thiết kế

## Định hướng giao diện

- mobile-first
- dark glass surface
- thao tác bằng một tay dễ tiếp cận
- ưu tiên nội dung chính hơn là trang trí

## Nguyên tắc UI

- chat phải đọc được ngay trên màn hình điện thoại
- terminal chỉ hiện khi người dùng cần thao tác trực tiếp
- header và composer phải gọn để nhường chỗ cho transcript
- các trạng thái kết nối, lỗi, streaming phải dễ nhận ra nhưng không lấn át

## Cần giữ

- route structure hiện có
- bottom navigation và luồng di chuyển hiện tại
- visual language từ giao diện đã import
- sự tách biệt rõ giữa chat surface và terminal surface

## Cần tránh

- đưa thêm một design system khác vào giữa dự án
- quay lại layout desktop-first
- dùng quá nhiều khung, viền, và padding làm mất không gian đọc
- biến terminal thành giao diện "giả chat"

## Hướng dẫn cho các lần polish sau

- mọi thay đổi UI phải kiểm tra trên màn hình nhỏ
- nếu có animation, phải có ý nghĩa và nhẹ
- ưu tiên readability, tap target, và scroll behavior
