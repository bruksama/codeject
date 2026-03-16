'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  size?: number;
  value: string;
}

export default function QrCode({ size = 192, value }: QrCodeProps) {
  const [svgMarkup, setSvgMarkup] = useState('');

  useEffect(() => {
    let cancelled = false;

    void QRCode.toString(value, {
      color: {
        dark: '#101828',
        light: '#ffffff',
      },
      margin: 1,
      type: 'svg',
      width: size,
    }).then((svg: string) => {
      if (!cancelled) {
        setSvgMarkup(svg);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  return (
    <div aria-label="QR code for remote access" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
  );
}
