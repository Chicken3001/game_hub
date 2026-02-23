import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 38,
          background: 'linear-gradient(145deg, #4f46e5 0%, #7c3aed 60%, #a855f7 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 110,
        }}
      >
        🎮
      </div>
    ),
    { ...size }
  );
}
