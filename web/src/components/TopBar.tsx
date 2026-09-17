import { useAuth } from "../auth/AuthContext";

export function TopBar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur rounded-3xl px-5 py-3 shadow-soft-card">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-theme-textPrimary text-white flex items-center justify-center font-bold">
          L
        </div>
        <div>
          <h1 className="font-bold text-sm text-theme-textPrimary">LentIA — Dashboard</h1>
          <p className="text-[11px] text-theme-textSecondary">Suivi du bac de lentilles</p>
        </div>
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-theme-textPrimary">{user.name}</p>
            <p className="text-[10px] text-theme-textSecondary">{user.email}</p>
          </div>
          {user.picture && (
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          )}
          <button onClick={signOut} className="text-xs font-bold text-theme-accent hover:underline">
            Déconnexion
          </button>
        </div>
      )}
    </header>
  );
}
