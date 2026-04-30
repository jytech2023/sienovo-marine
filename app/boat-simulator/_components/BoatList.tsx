'use client';

import type { BoatSummary } from '@/lib/useBoats';

type Props = {
  boats: BoatSummary[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function BoatList({ boats, activeId, onSelect }: Props) {
  if (boats.length === 0) {
    return (
      <section className="panel-section">
        <h3>
          船只列表
          <span className="boat-list-count empty">0</span>
        </h3>
        <div className="boat-list-empty">暂无在线船只</div>
      </section>
    );
  }

  return (
    <section className="panel-section">
      <h3>
        船只列表
        <span className="boat-list-count">{boats.length}</span>
      </h3>
      <div className="boat-list">
        {boats.map((boat) => {
          const isActive = boat.id === activeId;
          const batteryClass =
            boat.battery > 50 ? 'green' : boat.battery > 20 ? 'orange' : 'red';
          return (
            <button
              key={boat.id}
              type="button"
              className={`boat-list-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(boat.id)}
            >
              <div className="boat-list-row">
                <span className="boat-list-name">
                  {boat.name && boat.name !== boat.id ? boat.name : boat.id}
                </span>
                <span className={`boat-list-status ${boat.isOnline ? 'online' : 'offline'}`}>
                  {boat.isOnline ? '在线' : '离线'}
                </span>
              </div>
              {boat.name && boat.name !== boat.id && (
                <div className="boat-list-id">{boat.id}</div>
              )}
              <div className="boat-list-meta">
                {boat.isOnline ? (
                  <>
                    <span className={`boat-list-battery ${batteryClass}`}>
                      ⚡ {boat.battery.toFixed(0)}%
                    </span>
                    <span className="boat-list-signal">📶 {boat.signal.toFixed(0)}</span>
                    <span className="boat-list-distance">{boat.distance.toFixed(0)}m</span>
                  </>
                ) : (
                  <span className="boat-list-offline-hint">未上线</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
