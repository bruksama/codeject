'use client';

import { useEffect, useState } from 'react';

interface QrCodeProps {
  size?: number;
  value: string;
}

export default function QrCode({ size = 192, value }: QrCodeProps) {
  const [svgMarkup, setSvgMarkup] = useState('');

  useEffect(() => {
    let cancelled = false;

    void import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toString(value, {
          color: {
            dark: '#101828',
            light: '#ffffff',
          },
          margin: 1,
          type: 'svg',
          width: size,
        })
      )
      .then((svg: string) => {
        if (!cancelled) {
          setSvgMarkup(svg);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSvgMarkup('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  if (!svgMarkup) {
    return (
      <div
        aria-label="Generating QR code"
        className="skeleton rounded-3xl"
        style={{ height: size, width: size }}
      />
    );
  }

  return (
    <div aria-label="QR code for remote access" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
  );
}
