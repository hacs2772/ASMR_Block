import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IoEyeOffOutline } from 'react-icons/io5';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { errorMessage, hiddenApi } from '../../api/api';
import useHiddenStore from '../../store/hiddenStore';

/**
 * 내 정보: 숨긴 크리에이터 (V20) — @닉네임(누르면 크리에이터 페이지) + 다시 보기. 아무도 안 숨겼으면 안 보임
 * (앱 components/profile/HiddenCreators.tsx와 같음)
 */
function HiddenCreators({ className = '' }) {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const removeHidden = useHiddenStore((s) => s.remove);
  useEffect(() => { hiddenApi.list().then(setList).catch(() => setList([])); }, []);

  const unhide = async (id) => {
    try {
      await hiddenApi.unhide(id);
      removeHidden(id);
      setList((l) => l.filter((c) => c.id !== id));
      toast.success(t('hide.undone'));
    } catch (e) {
      toast.error(errorMessage(e, t('hide.failed')));
    }
  };

  if (!list || list.length === 0) return null;
  return (
    <div className={`card p-5 ${className}`} data-testid="hidden-creators">
      <p className="flex items-center gap-2 font-extrabold"><IoEyeOffOutline className="text-pink-text" aria-hidden="true" />{t('hide.listTitle')}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{t('hide.listNote')}</p>
      <ul className="mt-3 divide-y divide-line">
        {list.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <Link to={`/creator/${c.id}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:text-pink-text">@{c.nickname}</Link>
            <button type="button" className="btn-line btn-sm" onClick={() => unhide(c.id)} data-testid={`unhide-${c.id}`}>{t('hide.unhide')}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HiddenCreators;
