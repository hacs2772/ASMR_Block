import { create } from 'zustand';
import { coinApi } from '../api/api';

/** 내 코인 (사기 창·상점·내 정보에서 같이 씀). 로그인했을 때만 load */
const useWalletStore = create((set) => ({
  wallet: null,
  load: () => coinApi.wallet().then((wallet) => { set({ wallet }); return wallet; }).catch(() => null),
  set: (wallet) => set({ wallet }),
  clear: () => set({ wallet: null }),
}));

export default useWalletStore;
