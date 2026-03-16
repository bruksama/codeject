declare module 'qrcode' {
  interface ToStringOptions {
    color?: {
      dark?: string;
      light?: string;
    };
    margin?: number;
    type?: 'svg';
    width?: number;
  }

  const QRCode: {
    toString(value: string, options: ToStringOptions): Promise<string>;
  };

  export default QRCode;
}
