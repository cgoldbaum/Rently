'use client';

const PROP_TYPE: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Local comercial', PH: 'PH',
};

interface PortalHeaderProps {
  tenant: { name: string };
  property: { type: string; address: string };
  activeTab: string;
  tabs: { key: string; label: string; badge?: number }[];
  onTabChange: (key: string) => void;
}

export default function PortalHeader({ tenant, property, activeTab, tabs, onTabChange }: PortalHeaderProps) {
  return (
    <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '20px 20px 0', color: '#fff' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>
            {tenant.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>Hola, {tenant.name.split(' ')[0]}</div>
            <div style={{ fontSize: 13, opacity: 0.85 }}>{PROP_TYPE[property.type] ?? property.type} · {property.address}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: activeTab === t.key ? 700 : 400,
                color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.65)',
                borderBottom: activeTab === t.key ? '3px solid #fff' : '3px solid transparent',
                position: 'relative', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t.label}
              {t.badge ? (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
