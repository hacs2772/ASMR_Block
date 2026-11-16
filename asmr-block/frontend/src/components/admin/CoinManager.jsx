import React, { useCallback, useEffect, useState } from 'react';
import { IoCash, IoSearch, IoWallet } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { adminApi, errorMessage } from '../../api/api';
import BlockLoader from '../brand/BlockLoader';

/**
 * 코인 관리: 사람을 찾아 코인 주기(+)·회수(-) — 받은 코인(이벤트 코인)으로 들어감, 정산 안 됨.
 * 크리에이터 정산: 충전 코인으로 팔린 몫(정산 대기)을 실제로 송금한 뒤 "정산 완료로 표시"
 */
function CoinManager() {
  return (
    <div className="space-y-10">
      <GrantPanel />
      <EarningsPanel />
    </div>
  );
}

function GrantPanel() {
  const [q, setQ] = useState('');
  const [users, setUsers] = useState(null);
  const [open, setOpen] = useState(null);
  const search = useCallback((query) => {
    adminApi.coinUsers(query).then(setUsers).catch((e) => { toast.error(errorMessage(e)); setUsers([]); });
  }, []);
  useEffect(() => { search(''); }, [search]);

  return (
    <section>
      <div className="flex items-center gap-2">
        <IoWallet className="text-pink-text" />
        <h2 className="text-lg font-extrabold">코인 주기</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        베타 테스터에게 코인을 줘서 유료 블록을 사 보게 할 수 있어요. 준 코인은 <b className="text-ink">받은 코인</b>이라
        크리에이터 정산에는 안 들어가요. 잘못 줬으면 앞에 <b className="text-ink">-</b>를 붙여 회수해요(받은 코인에서만).
      </p>
      <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); search(q.trim()); }}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이메일이나 닉네임 일부 (비우면 최근 가입)" data-testid="coin-search" />
        <button type="submit" className="btn-line shrink-0" data-testid="coin-search-btn"><IoSearch /> 찾기</button>
      </form>
      <div className="mt-3">
        {users === null ? <BlockLoader small /> : users.length === 0 ? (
          <p className="card p-5 text-sm text-muted">찾는 사람이 없어요.</p>
        ) : (
          <div className="card divide-y divide-line">
            {users.map((u) => (
              <div key={u.id} className="p-4" data-testid={`coin-user-${u.id}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{u.nickname}</p>
                    <p className="truncate text-xs text-faint">{u.email} · #{u.id}</p>
                  </div>
                  <p className="text-xs text-muted">받은 {u.bonus} · 충전 {u.paid}</p>
                  <p className="w-20 text-right font-extrabold" data-testid={`coin-balance-${u.id}`}>{u.balance}코인</p>
                  <button type="button" className="btn-line btn-sm" onClick={() => setOpen(open === u.id ? null : u.id)}>코인 주기</button>
                </div>
                {open === u.id && (
                  <GrantForm user={u} onDone={(updated) => {
                    setUsers((list) => list.map((x) => (x.id === updated.id ? updated : x)));
                    setOpen(null);
                  }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function GrantForm({ user, onDone }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n === 0) return toast.error('코인 수를 적어 주세요. (회수는 앞에 -)');
    setSaving(true);
    try {
      const res = await adminApi.grantCoins(user.id, n, note.trim() || null);
      toast.success(res.message);
      onDone(res.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
    return undefined;
  };
  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap gap-2 rounded-xl bg-night p-3" data-testid="coin-grant-form">
      <input className="input w-28" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="예: 100" data-testid="coin-amount" />
      <input className="input min-w-0 flex-1" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200}
        placeholder="이유 (그 사람 코인 내역에 보여요, 예: 베타 테스터 감사)" data-testid="coin-note" />
      <button type="submit" className="btn-pink btn-sm" disabled={saving} data-testid="coin-grant">{Number(amount) < 0 ? '회수' : '주기'}</button>
    </form>
  );
}

function EarningsPanel() {
  const [rows, setRows] = useState(null);
  useEffect(() => { adminApi.earnings().then(setRows).catch((e) => { toast.error(errorMessage(e)); setRows([]); }); }, []);
  const settle = async (r) => {
    const note = window.prompt(`${r.nickname}님에게 ${r.pendingCoins}코인(${r.pendingKrw.toLocaleString('ko-KR')}원)을 송금했나요?\n메모(선택, 예: 11월 정산 국민은행 송금)`, '');
    if (note === null) return;
    try {
      const res = await adminApi.settle(r.creatorId, note.trim() || null);
      toast.success(res.message);
      setRows(res.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2">
        <IoCash className="text-pink-text" />
        <h2 className="text-lg font-extrabold">크리에이터 정산</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        블록이 <b className="text-ink">충전 코인</b>으로 팔리면 정해 둔 비율(설정 <code>app.coins.creator-share-percent</code>)만큼 크리에이터 몫이 쌓여요.
        실제 송금은 직접 하고, 보낸 뒤에 &ldquo;정산 완료로 표시&rdquo;를 눌러 기록을 남겨요. 받은 코인으로 팔린 건 몫이 없어요.
      </p>
      <div className="mt-3">
        {rows === null ? <BlockLoader small /> : rows.length === 0 ? (
          <p className="card p-5 text-sm text-muted">아직 팔린 블록이 없어요.</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="p-3">크리에이터</th><th className="p-3 text-right">판매</th><th className="p-3 text-right">팔린 코인</th>
                  <th className="p-3 text-right">그중 받은 코인</th><th className="p-3 text-right">정산 대기</th><th className="p-3 text-right">정산함</th><th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.creatorId} data-testid={`earning-${r.creatorId}`}>
                    <td className="p-3"><p className="font-bold">{r.nickname}</p><p className="text-xs text-faint">{r.email}</p></td>
                    <td className="p-3 text-right">{r.salesCount}</td>
                    <td className="p-3 text-right">{r.soldCoins}</td>
                    <td className="p-3 text-right text-muted">{r.bonusSoldCoins}</td>
                    <td className="p-3 text-right font-extrabold">{r.pendingCoins}코인<p className="text-xs font-normal text-muted">{r.pendingKrw.toLocaleString('ko-KR')}원</p></td>
                    <td className="p-3 text-right text-muted">{r.settledCoins}</td>
                    <td className="p-3 text-right">
                      <button type="button" className="btn-line btn-sm" disabled={r.pendingCoins <= 0} onClick={() => settle(r)} data-testid={`settle-${r.creatorId}`}>정산 완료로 표시</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default CoinManager;
