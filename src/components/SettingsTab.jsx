import { useEffect, useRef } from 'react';

export default function SettingsTab({ D, onEdit, onExport, onReset }) {
  const qrRef = useRef(null);

  const buildUrl = () => {
    const base = D.settings.registerUrl;
    if (!base) return '';
    const params = new URLSearchParams({
      cafe: D.settings.cafeName,
      req: String(D.settings.stampsRequired),
    });
    return base + (base.includes('?') ? '&' : '?') + params;
  };

  useEffect(() => {
    const url = buildUrl();
    if (!url || !qrRef.current) return;
    qrRef.current.innerHTML = '';
    const loadQR = () => {
      new window.QRCode(qrRef.current, {
        text: url,
        width: 200,
        height: 200,
        colorDark: '#3E2010',
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M,
      });
    };
    if (window.QRCode) {
      loadQR();
    } else {
      const s = document.createElement('script');
      s.src =
        'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = loadQR;
      document.head.appendChild(s);
    }
  }, [D.settings.registerUrl, D.settings.cafeName, D.settings.stampsRequired]);

  const qrUrl = buildUrl();

  return (
    <div className="screen active">
      <div className="header">
        <h1>설정</h1>
        <p>카페 운영 설정</p>
      </div>

      <div className="section-title">카페 정보</div>
      <div className="settings-block">
        {[
          {
            key: 'cafeName',
            icon: '☕',
            title: '카페 닉네임',
            sub: D.settings.cafeName,
          },
          {
            key: 'stampsRequired',
            icon: '🎯',
            title: '쿠폰 완성 도장 수',
            sub: D.settings.stampsRequired + '개',
          },
          {
            key: 'reward',
            icon: '🎁',
            title: '쿠폰 보상 내용',
            sub: D.settings.reward,
          },
          {
            key: 'password',
            icon: '🔐',
            title: '비밀번호 변경',
            sub: '사장님 모드 잠금 번호',
          },
        ].map(({ key, icon, title, sub }) => (
          <button
            key={key}
            className="settings-row"
            onClick={() => onEdit(key)}
          >
            <span className="s-icon">{icon}</span>
            <div className="s-text">
              <h3>{title}</h3>
              <p>{sub}</p>
            </div>
            <span className="s-arrow">›</span>
          </button>
        ))}
      </div>

      <div className="section-title">QR 손님 등록</div>
      <div className="settings-block">
        <button className="settings-row" onClick={() => onEdit('registerUrl')}>
          <span className="s-icon">🔗</span>
          <div className="s-text">
            <h3>등록 페이지 URL</h3>
            <p>{D.settings.registerUrl || 'Vercel 배포 후 주소 입력'}</p>
          </div>
          <span className="s-arrow">›</span>
        </button>
      </div>

      {qrUrl && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#6B4226',
              marginBottom: 12,
            }}
          >
            📷 손님용 QR 코드
          </div>
          <div
            ref={qrRef}
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          />
          <div style={{ fontSize: 11, color: '#999', lineHeight: 1.6 }}>
            카운터에 출력하거나 화면을 보여주세요
            <br />
            손님이 스캔하면 등록 페이지가 열려요
          </div>
        </div>
      )}

      <div className="section-title">데이터 관리</div>
      <div className="settings-block">
        <button className="settings-row" onClick={onExport}>
          <span className="s-icon">📤</span>
          <div className="s-text">
            <h3>손님 목록 내보내기</h3>
            <p>CSV 파일로 다운로드</p>
          </div>
          <span className="s-arrow">›</span>
        </button>
        <button className="settings-row" onClick={onReset}>
          <span className="s-icon">🗑️</span>
          <div className="s-text">
            <h3>전체 데이터 초기화</h3>
            <p style={{ color: '#E53935' }}>모든 손님 정보 삭제</p>
          </div>
          <span className="s-arrow">›</span>
        </button>
      </div>

      <div
        style={{
          textAlign: 'center',
          padding: '24px 20px 10px',
          color: '#CCC',
          fontSize: 12,
        }}
      >
        카페 도장쿠폰 v2.0 · Made with ☕
      </div>
    </div>
  );
}
