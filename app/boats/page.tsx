'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LogoLockup } from '../_components/Logo';
import {
  createBoat,
  deleteBoat,
  useBoats,
  DEFAULT_CONFIG_TEMPLATE,
  type ConfigItem,
  type ConfigType,
} from '@/lib/useBoats';
import { useFleetState } from '@/lib/useFleetState';

type Filter = 'all' | 'online' | 'offline';

export default function BoatsPage() {
  const { boats: dbBoats, error, refresh } = useBoats(60_000);
  const { stateById, errorMessage: liveError } = useFleetState();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Merge DB metadata (name/group/notes) with live MQTT telemetry.
  const boats = useMemo(() => {
    return dbBoats.map((b) => {
      const live = stateById[b.id];
      if (!live) return b;
      return {
        ...b,
        isOnline: live.isOnline,
        lat: live.lat,
        lng: live.lng,
        battery: live.battery,
        signal: live.signal,
        baitLevel: live.baitLevel,
        distance: live.distance,
      };
    });
  }, [dbBoats, stateById]);

  const filtered = useMemo(() => {
    return boats.filter((b) => {
      if (filter === 'online' && !b.isOnline) return false;
      if (filter === 'offline' && b.isOnline) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        b.id.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.group.toLowerCase().includes(q)
      );
    });
  }, [boats, filter, query]);

  const onlineCount = boats.filter((b) => b.isOnline).length;
  const lowBatteryCount = boats.filter((b) => b.isOnline && b.battery < 20).length;
  const avgSignal =
    boats.filter((b) => b.isOnline).reduce((s, b) => s + b.signal, 0) /
      Math.max(1, onlineCount) || 0;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确认删除船只 "${name}" (${id})？此操作不可恢复。`)) return;
    try {
      await deleteBoat(id);
      refresh();
    } catch (e) {
      alert(`删除失败：${e instanceof Error ? e.message : 'unknown'}`);
    }
  };

  return (
    <main className="boats-page">
      <header className="boats-header">
        <Link href="/" className="boats-back">
          <LogoLockup size={20} />
        </Link>
        <h1 className="boats-title">船只管理</h1>
        <button
          type="button"
          className="boats-primary-btn"
          onClick={() => setShowCreate(true)}
        >
          + 新建船只
        </button>
        <Link href="/boat-simulator" className="boats-link-btn">
          打开中控台 →
        </Link>
      </header>

      <div className="boats-banner">
        <span className="boats-banner-tag">v1</span>
        <span>
          当前为<b>虚拟船</b>模式，用于研发、演示与培训。真实船端硬件将在后续版本接入。
        </span>
      </div>

      <section className="boats-stats">
        <div className="stat-block">
          <div className="stat-block-label">在线</div>
          <div className="stat-block-value green">{onlineCount}</div>
          <div className="stat-block-hint">共 {boats.length} 艘</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">离线</div>
          <div className="stat-block-value red">{boats.length - onlineCount}</div>
          <div className="stat-block-hint">需排查</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">低电量</div>
          <div className="stat-block-value orange">{lowBatteryCount}</div>
          <div className="stat-block-hint">{'< 20%'}</div>
        </div>
        <div className="stat-block">
          <div className="stat-block-label">平均信号</div>
          <div className="stat-block-value blue">{avgSignal.toFixed(0)}</div>
          <div className="stat-block-hint">在线平均</div>
        </div>
      </section>

      <section className="boats-toolbar">
        <div className="boats-filter">
          {(['all', 'online', 'offline'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              className={`boats-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'online' ? '在线' : '离线'}
            </button>
          ))}
        </div>
        <input
          type="text"
          className="boats-search"
          placeholder="按 ID / 名称 / 分组 搜索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </section>

      {(error || liveError) && (
        <div className="boats-error">
          {error
            ? `无法读取船队元数据（${error}）—— 检查 Neon DB 连接`
            : `MQTT 实时流异常（${liveError}）—— 检查 Cognito + IoT 配置`}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="boats-empty">
          {boats.length === 0
            ? '尚无任何船只。点击右上角"新建船只"录入第一艘，或先在中控台启动模拟船只。'
            : '没有符合筛选条件的船只。'}
        </div>
      ) : (
        <div className="boats-table-wrap">
          <table className="boats-table">
            <thead>
              <tr>
                <th>名称 / ID</th>
                <th>分组</th>
                <th>状态</th>
                <th>电量</th>
                <th>信号</th>
                <th>饵料</th>
                <th>距离</th>
                <th>坐标</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const battClass =
                  b.battery > 50 ? 'green' : b.battery > 20 ? 'orange' : 'red';
                return (
                  <tr key={b.id}>
                    <td>
                      <div className="boat-name-cell">{b.name}</div>
                      <div className="boat-id-sub">{b.id}</div>
                    </td>
                    <td className="boat-group-cell">{b.group || '—'}</td>
                    <td>
                      <span
                        className={`boat-list-status ${b.isOnline ? 'online' : 'offline'}`}
                      >
                        {b.isOnline ? '在线' : '离线'}
                      </span>
                    </td>
                    <td className={b.isOnline ? battClass : 'muted'}>
                      {b.isOnline ? `${b.battery.toFixed(0)}%` : '—'}
                    </td>
                    <td className={b.isOnline ? '' : 'muted'}>
                      {b.isOnline ? b.signal.toFixed(0) : '—'}
                    </td>
                    <td className={b.isOnline ? '' : 'muted'}>
                      {b.isOnline ? `${b.baitLevel.toFixed(0)}%` : '—'}
                    </td>
                    <td className={b.isOnline ? '' : 'muted'}>
                      {b.isOnline ? `${b.distance.toFixed(0)} m` : '—'}
                    </td>
                    <td className="gps-cell">
                      {b.isOnline
                        ? `${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}`
                        : '—'}
                    </td>
                    <td className="boat-actions">
                      <Link
                        href={`/boats/${encodeURIComponent(b.id)}/status`}
                        className="boat-action"
                      >
                        状态
                      </Link>
                      <Link
                        href={`/boats/${encodeURIComponent(b.id)}/control`}
                        className="boat-action"
                      >
                        操作
                      </Link>
                      <button
                        type="button"
                        className="boat-action danger"
                        onClick={() => handleDelete(b.id, b.name)}
                        disabled={b.isOnline}
                        title={b.isOnline ? '请先离线再删除' : '删除此船只'}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateBoatModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refresh();
          }}
        />
      )}
    </main>
  );
}

function slugifyKey(label: string): string {
  return (
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || `field_${Date.now()}`
  );
}

const TYPE_LABELS: Record<ConfigType, string> = {
  text: '文本',
  number: '数值',
  option: '选项',
  toggle: '开关',
};

function CreateBoatModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [config, setConfig] = useState<ConfigItem[]>(() =>
    DEFAULT_CONFIG_TEMPLATE.map((item) => ({ ...item })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const updateItem = (index: number, patch: Partial<ConfigItem>) => {
    setConfig((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const removeItem = (index: number) => {
    setConfig((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      await createBoat({
        id: id.trim(),
        name: name.trim(),
        group,
        notes,
        config,
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>新建船只</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form className="modal-body" onSubmit={onSubmit}>
          <div className="form-section-title">基础信息</div>
          <label className="form-row">
            <span className="form-label">
              船只 ID <span className="form-required">*</span>
            </span>
            <input
              type="text"
              className="form-input"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="如 BOAT-A3F8（2-32 位字母/数字/_-）"
              required
              autoFocus
              maxLength={32}
            />
          </label>
          <label className="form-row">
            <span className="form-label">
              名称 <span className="form-required">*</span>
            </span>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如 大航海 001"
              required
              maxLength={50}
            />
          </label>
          <label className="form-row">
            <span className="form-label">分组</span>
            <input
              type="text"
              className="form-input"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="如 北塘 / 试验区"
              maxLength={30}
            />
          </label>
          <label className="form-row">
            <span className="form-label">备注</span>
            <textarea
              className="form-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="可选"
              rows={2}
              maxLength={200}
            />
          </label>

          <div className="form-section-title">
            配置参数
            <span className="form-section-meta">{config.length} 项</span>
          </div>

          <div className="config-list">
            {config.map((item, index) => (
              <ConfigItemEditor
                key={`${item.key}-${index}`}
                item={item}
                onChange={(patch) => updateItem(index, patch)}
                onRemove={() => removeItem(index)}
              />
            ))}
          </div>

          <AddConfigButton
            onAdd={(item) => setConfig((prev) => [...prev, item])}
            existingKeys={config.map((c) => c.key)}
          />

          {err && <div className="form-error">{err}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="boats-primary-btn"
              disabled={submitting || !id.trim() || !name.trim()}
            >
              {submitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfigItemEditor({
  item,
  onChange,
  onRemove,
}: {
  item: ConfigItem;
  onChange: (patch: Partial<ConfigItem>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="config-item">
      <div className="config-item-head">
        <span className="config-item-label">{item.label}</span>
        <span className={`config-item-type type-${item.type}`}>
          {TYPE_LABELS[item.type]}
        </span>
        <button
          type="button"
          className="config-item-remove"
          onClick={onRemove}
          title="删除此配置项"
        >
          ×
        </button>
      </div>
      <div className="config-item-value">
        {item.type === 'text' && (
          <input
            type="text"
            className="form-input"
            value={String(item.value ?? '')}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder={item.placeholder}
          />
        )}
        {item.type === 'number' && (
          <div className="config-number-row">
            <input
              type="number"
              className="form-input"
              value={Number(item.value ?? 0)}
              onChange={(e) => onChange({ value: Number(e.target.value) })}
            />
            {item.unit && <span className="config-unit">{item.unit}</span>}
          </div>
        )}
        {item.type === 'option' && item.options && (
          <select
            className="form-input"
            value={String(item.value ?? '')}
            onChange={(e) => onChange({ value: e.target.value })}
          >
            {item.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}
        {item.type === 'toggle' && (
          <button
            type="button"
            className={`config-toggle ${item.value ? 'on' : 'off'}`}
            onClick={() => onChange({ value: !item.value })}
            aria-pressed={Boolean(item.value)}
          >
            <span className="config-toggle-track">
              <span className="config-toggle-thumb" />
            </span>
            <span className="config-toggle-text">
              {item.value ? '开启' : '关闭'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function AddConfigButton({
  onAdd,
  existingKeys,
}: {
  onAdd: (item: ConfigItem) => void;
  existingKeys: string[];
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<ConfigType>('text');
  const [unit, setUnit] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setLabel('');
    setType('text');
    setUnit('');
    setOptionsText('');
    setErr(null);
  };

  const submit = () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setErr('请输入名称');
      return;
    }
    let key = slugifyKey(trimmed);
    let suffix = 1;
    while (existingKeys.includes(key)) {
      key = `${slugifyKey(trimmed)}_${suffix++}`;
    }
    const item: ConfigItem = { key, label: trimmed, type, value: '' };
    if (type === 'number') item.value = 0;
    if (type === 'toggle') item.value = false;
    if (unit.trim()) item.unit = unit.trim();
    if (type === 'option') {
      const opts = optionsText
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length === 0) {
        setErr('选项类型至少需要 1 个选项');
        return;
      }
      item.options = opts;
      item.value = opts[0];
    }
    onAdd(item);
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        className="add-config-btn"
        onClick={() => setOpen(true)}
      >
        + 添加配置项
      </button>
    );
  }

  return (
    <div className="add-config-form">
      <div className="add-config-row">
        <input
          type="text"
          className="form-input"
          placeholder="名称（如 电机型号）"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          autoFocus
        />
        <select
          className="form-input"
          value={type}
          onChange={(e) => setType(e.target.value as ConfigType)}
        >
          <option value="text">文本</option>
          <option value="number">数值</option>
          <option value="option">选项</option>
          <option value="toggle">开关</option>
        </select>
      </div>
      {type === 'number' && (
        <input
          type="text"
          className="form-input"
          placeholder="单位（可选，如 米 / 摄氏度）"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      )}
      {type === 'option' && (
        <input
          type="text"
          className="form-input"
          placeholder="选项列表，逗号分隔（如 电机A, 电机B）"
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
      )}
      {err && <div className="form-error">{err}</div>}
      <div className="add-config-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          取消
        </button>
        <button type="button" className="boats-primary-btn" onClick={submit}>
          添加
        </button>
      </div>
    </div>
  );
}
