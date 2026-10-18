// @ts-nocheck
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleAlert,
  Clock3, Crown, LogOut, Play, Plus, Radio, RefreshCw, Sparkles, Trophy, Users, X, XCircle, Zap,
} from 'lucide-react';
import {
  useAdminLogin, useTeamLogin, useGetCurrentUser, useListTeams,
  useCreateTeam, useUpdateTeam, useDeactivateTeam, useListQuestions, useGetCurrentQuiz,
  useStartQuiz, useCloseAnswers, useRevealAnswer, useShowLeaderboard, useNextQuestion,
  useFinishQuiz, useResetQuiz, useSubmitAnswer,
  getGetCurrentQuizQueryKey, getListTeamsQueryKey, setAuthTokenGetter,
} from './api-client';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

function storeSession(session) {
  if (session?.token) {
    localStorage.setItem('timothy_token', session.token);
    setAuthTokenGetter(() => localStorage.getItem('timothy_token'));
  }
}
if (typeof window !== 'undefined' && localStorage.getItem('timothy_token')) {
  setAuthTokenGetter(() => localStorage.getItem('timothy_token'));
}

function Logo({ compact = false }) {
  return <Link href="/" className="focus-ring inline-flex items-center gap-3" data-testid="link-home">
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_24px_hsl(41_91%_61%/.2)]">
      <BookOpen size={20} strokeWidth={2.5} />
    </span>
    {!compact && <span className="font-display text-sm font-bold tracking-tight text-foreground">CJM <span className="text-primary">Youth Fellowship</span></span>}
  </Link>;
}

function ConnectionNotice({ error, onRetry }) {
  if (!error) return null;
  return <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground" data-testid="status-connection-error">
    <CircleAlert className="mt-0.5 shrink-0 text-destructive" size={18} />
    <div className="flex-1"><p className="font-semibold">The room is out of reach</p><p className="mt-1 text-destructive-foreground/75">We could not sync with the quiz server. Your room state has not been changed.</p></div>
    {onRetry && <button onClick={onRetry} className="focus-ring rounded-lg border border-destructive/30 px-3 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/10" data-testid="button-retry-connection">Retry</button>}
  </div>;
}

function useQuizRealtime(role) {
  useEffect(() => {
    const token = localStorage.getItem('timothy_token');
    if (!token) return undefined;
    const socket = io({ path: '/socket.io', auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('quiz_state', (state) => {
      queryClient.setQueryData(getGetCurrentQuizQueryKey(), state);
      queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
    });
    socket.on('team_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
    });
    socket.on('connect', () => {
      queryClient.invalidateQueries({ queryKey: getGetCurrentQuizQueryKey() });
      if (role === 'admin') queryClient.invalidateQueries({ queryKey: getListTeamsQueryKey() });
    });
    return () => socket.disconnect();
  }, [role]);
}

function Button({ children, className = '', variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow-[0_8px_18px_hsl(41_91%_61%/.16)] hover:-translate-y-0.5 hover:brightness-105',
    secondary: 'border border-border bg-secondary text-foreground hover:border-primary/50 hover:bg-secondary/80',
    coral: 'bg-accent text-accent-foreground shadow-[0_8px_18px_hsl(7_78%_63%/.16)] hover:-translate-y-0.5 hover:brightness-105',
    ghost: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    danger: 'border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20',
  };
  return <button className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition duration-200 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 ${variants[variant]} ${className}`} {...props}>{children}</button>;
}

function StatusPill({ label, tone = 'muted', dot = false }) {
  const tones = { live: 'border-primary/30 bg-primary/10 text-primary', success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300', coral: 'border-accent/30 bg-accent/10 text-accent', muted: 'border-border bg-secondary text-muted-foreground', danger: 'border-destructive/30 bg-destructive/10 text-destructive' };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] ${tones[tone]}`}>{dot && <span className={`h-1.5 w-1.5 rounded-full ${tone === 'live' ? 'bg-primary animate-pulse' : tone === 'success' ? 'bg-emerald-300' : 'bg-current'}`} />} {label}</span>;
}

function Shell({ children, variant = 'default' }) {
  return <div className={`min-h-[100dvh] ${variant === 'admin' ? 'bg-[hsl(238_38%_8%)]' : ''}`}>
    <header className="border-b border-border/70 bg-[hsl(238_38%_9%/.75)] px-5 py-4 backdrop-blur-xl md:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between"><Logo />
        {variant === 'admin' ? <div className="hidden items-center gap-3 sm:flex"><StatusPill label="live room" tone="live" dot /><span className="text-xs text-muted-foreground">Quiz master console</span></div> : <div className="text-xs font-semibold text-muted-foreground">A Product of DAverse</div>}
      </div>
    </header>
    {children}
  </div>;
}

function Home() {
  return <Shell><main className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-12 md:min-h-[calc(100dvh-76px)] md:grid-cols-[1.1fr_.9fr] md:px-8 md:py-16">
    <section className="animate-rise">
      <div className="mb-8 flex items-center gap-3"><span className="h-px w-10 bg-primary" /><span className="eyebrow">A live scripture challenge</span></div>
      <h1 className="font-display text-5xl font-bold leading-[.98] tracking-[-.055em] text-foreground sm:text-7xl">Know the Word.<br /><span className="text-primary">Play as one.</span></h1>
      <p className="mt-7 max-w-lg text-lg leading-8 text-muted-foreground">A synchronized Bible quiz for youth fellowship teams, built for the moment the room gets quiet and every answer matters.</p>
      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Link href="/admin/login" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[0_8px_18px_hsl(41_91%_61%/.16)] transition hover:-translate-y-0.5 hover:brightness-105" data-testid="link-admin-login">Enter as quiz master <ArrowRight size={17} /></Link>
        <Link href="/login" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-5 text-sm font-bold text-foreground transition hover:border-primary/50 hover:bg-secondary/80" data-testid="link-team-login">Join your team <Users size={17} /></Link>
      </div>
      {/* <div className="mt-12 flex items-center gap-8 border-t border-border/70 pt-6 text-xs text-muted-foreground"><div><span className="font-display text-2xl font-bold text-foreground">04</span><span className="ml-2">team seats</span></div><div><span className="font-display text-2xl font-bold text-foreground">1</span><span className="ml-2">shared room</span></div><div><span className="font-display text-2xl font-bold text-foreground">∞</span><span className="ml-2">good questions</span></div>
      </div> */}
    </section>
    {/* <section className="relative animate-rise [animation-delay:120ms]">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle,hsl(41_91%_61%/.12),transparent_65%)]" />
      <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-5 shadow-2xl md:p-7">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        <div className="flex items-center justify-between border-b border-border pb-5"><div><p className="eyebrow">Tonight's room</p><p className="mt-1 font-display text-xl font-bold">1 Timothy — Chapter 4</p></div><StatusPill label="ready" tone="success" dot /></div>
        <div className="py-8"><div className="mx-auto grid h-40 w-40 place-items-center rounded-full border border-primary/30 bg-primary/5 animate-pulse-ring"><div className="grid h-28 w-28 place-items-center rounded-full border border-primary/40 bg-primary/10"><Radio className="text-primary" size={38} /></div></div><p className="mt-6 text-center text-sm font-semibold text-muted-foreground">The room moves together.</p></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-secondary/60 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users size={14} /> Teams connected</div><p className="mt-2 font-display text-3xl font-bold">04</p></div><div className="rounded-xl border border-border bg-secondary/60 p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy size={14} /> Questions</div><p className="mt-2 font-display text-3xl font-bold">12</p></div></div>
      </div>
    </section> */}
  </main></Shell>;
}

function AuthPage({ admin = false }) {
  const [, setLocation] = useLocation();
  const login = admin ? useAdminLogin() : useTeamLogin();
  const [values, setValues] = useState({ username: '', password: '' });
  const [message, setMessage] = useState('');
  const submit = (event) => {
    event.preventDefault(); setMessage('');
    login.mutate({ data: values }, { onSuccess: (session) => { storeSession(session); setLocation(admin ? '/admin/dashboard' : '/team'); }, onError: (error) => setMessage(error?.message || 'Sign in failed. Check your details and try again.') });
  };
  return <Shell><main className="mx-auto grid max-w-5xl items-center gap-12 px-5 py-10 md:min-h-[calc(100dvh-76px)] md:grid-cols-[.85fr_1.15fr] md:px-8">
    <section className="hidden md:block"><span className="eyebrow">{admin ? 'For the person holding the room' : 'For every team at the table'}</span><h1 className="mt-5 max-w-md font-display text-5xl font-bold leading-[1.02] tracking-[-.05em]">{admin ? <>Set the pace.<br /><span className="text-primary">Hold the room.</span></> : <>Your team is<br /><span className="text-primary">in the game.</span></>}</h1><p className="mt-6 max-w-sm leading-7 text-muted-foreground">{admin ? 'Start the session, watch the room, and reveal the answer when every team has committed.' : 'One shared question. One answer from your team. Stay close to the countdown and play together.'}</p></section>
    <section className="glass mx-auto w-full max-w-md rounded-3xl p-6 shadow-2xl md:p-8 animate-rise"><Logo compact /><div className="mt-8"><p className="eyebrow">{admin ? 'Quiz master sign in' : 'Team sign in'}</p><h2 className="mt-2 font-display text-3xl font-bold">{admin ? 'Open the console' : 'Join the live room'}</h2><p className="mt-2 text-sm text-muted-foreground">{admin ? 'Use the credentials assigned to your quiz master account.' : 'Ask your quiz master for your team username and password.'}</p></div>
      {message && <div className="mt-5 flex gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive-foreground" data-testid="status-login-error"><CircleAlert size={17} className="shrink-0 text-destructive" />{message}</div>}
      <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-semibold">Username<input required value={values.username} onChange={(e) => setValues({ ...values, username: e.target.value })} className="focus-ring mt-2 h-12 w-full rounded-xl border border-input bg-secondary/60 px-4 text-foreground outline-none transition focus:border-primary" placeholder={admin ? 'quiz.master' : 'team-olive'} data-testid="input-username" /></label><label className="block text-sm font-semibold">Password<input required type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} className="focus-ring mt-2 h-12 w-full rounded-xl border border-input bg-secondary/60 px-4 text-foreground outline-none transition focus:border-primary" placeholder="Enter password" data-testid="input-password" /></label><Button type="submit" className="mt-3 w-full" disabled={login.isPending}>{login.isPending ? <><RefreshCw size={16} className="animate-spin" /> Checking access…</> : <>Continue <ArrowRight size={16} /></>}</Button></form>
      <p className="mt-6 text-center text-xs text-muted-foreground">{admin ? 'Need team access instead?' : 'Running the room?' } <Link href={admin ? '/login' : '/admin/login'} className="font-bold text-primary hover:underline" data-testid="link-switch-login">{admin ? 'Team sign in' : 'Quiz master sign in'}</Link></p>
    </section>
  </main></Shell>;
}

function StatCard({ icon: Icon, label, value, detail, tone = 'primary' }) {
  return <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p></div><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone === 'coral' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}><Icon size={19} /></span></div>{detail && <p className="mt-3 text-xs text-muted-foreground">{detail}</p>}</div>;
}

function AdminDashboard() {
  const [, setLocation] = useLocation();
  const user = useGetCurrentUser();
  const teamsQuery = useListTeams();
  const questionsQuery = useListQuestions();
  const quizQuery = useGetCurrentQuiz({ query: { refetchInterval: 5000, queryKey: ['/api/quiz/current'] } });
  const [quiz, setQuiz] = useState(null);
  const [teamModal, setTeamModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [teamForm, setTeamForm] = useState({ teamName: '', username: '', password: '' });
  const [feedback, setFeedback] = useState('');
  const start = useStartQuiz(); const close = useCloseAnswers(); const reveal = useRevealAnswer(); const leaderboard = useShowLeaderboard(); const next = useNextQuestion(); const finish = useFinishQuiz(); const reset = useResetQuiz();
  const create = useCreateTeam(); const update = useUpdateTeam(); const deactivate = useDeactivateTeam();
  useQuizRealtime('admin');
  useEffect(() => { if (quizQuery.data) setQuiz(quizQuery.data); }, [quizQuery.data]);
  useEffect(() => { if (user.data && user.data.role !== 'admin') setLocation('/login'); }, [user.data, setLocation]);
  const teams = teamsQuery.data || [];
  const current = quiz || quizQuery.data;
  const action = (mutation) => mutation.mutate(undefined, { onSuccess: (nextState) => { setQuiz(nextState); quizQuery.refetch(); teamsQuery.refetch(); setFeedback('Room state updated.'); }, onError: (e) => setFeedback(e?.message || 'That room action could not be completed.') });
  const submitTeam = (e) => { e.preventDefault(); const cb = { onSuccess: () => { setTeamModal(false); setEditing(null); setTeamForm({ teamName: '', username: '', password: '' }); teamsQuery.refetch(); setFeedback(editing ? 'Team details updated.' : 'Team added to the room.'); }, onError: (err) => setFeedback(err?.message || 'Could not save this team.') }; editing ? update.mutate({ teamId: editing.id, data: { ...teamForm, password: teamForm.password || null } }, cb) : create.mutate({ data: { ...teamForm, active: true } }, cb); };
  const openEdit = (team) => { setEditing(team); setTeamForm({ teamName: team.teamName, username: team.username, password: '' }); setTeamModal(true); };
  const status = current?.status || 'WAITING';
  const question = current?.currentQuestion;
  if (user.isLoading || quizQuery.isLoading || teamsQuery.isLoading) return <AdminLoading />;
  return <Shell variant="admin"><main className="mx-auto max-w-[1440px] px-5 py-7 md:px-8">
     <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="eyebrow">Quiz master console</p><h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">Good evening, {user.data?.username || 'quiz master'}.</h1><p className="mt-2 text-sm text-muted-foreground">Keep the room moving. Everyone is looking at the same board.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { localStorage.removeItem('timothy_token'); setAuthTokenGetter(null); setLocation('/'); }} data-testid="button-admin-logout"><LogOut size={16} /> Sign out</Button><Button variant="danger" onClick={() => window.confirm('Reset this quiz and clear all scores? The teams and question bank will stay in place.') && action(reset)} disabled={reset.isPending || status === 'WAITING'} data-testid="button-reset-quiz"><RefreshCw size={16} /> {reset.isPending ? 'Resetting…' : 'Reset quiz'}</Button><Button onClick={() => action(start)} disabled={status !== 'WAITING' || start.isPending} data-testid="button-start-quiz"><Play size={16} /> {status === 'WAITING' ? 'Start quiz' : 'Quiz in progress'}</Button></div></div>
    <ConnectionNotice error={quizQuery.isError || teamsQuery.isError} onRetry={() => { quizQuery.refetch(); teamsQuery.refetch(); }} />
    {feedback && <div className="mb-5 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary" data-testid="status-admin-feedback"><CheckCircle2 size={17} />{feedback}<button className="ml-auto text-primary/70 hover:text-primary" onClick={() => setFeedback('')} data-testid="button-dismiss-feedback"><X size={15} /></button></div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Radio} label="Room status" value={status.replace('_', ' ')} detail={current ? `${current.currentQuestionIndex + 1} of ${current.totalQuestions} questions` : 'Waiting to begin'} /><StatCard icon={Users} label="Teams online" value={`${teams.filter((t) => t.online).length}/${teams.length || 4}`} detail={`${teams.filter((t) => t.answered).length} answered this round`} /><StatCard icon={Clock3} label="Question state" value={current?.questionStatus || 'WAITING'} detail={current?.answerDeadline ? `Deadline ${new Date(current.answerDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No active timer'} tone="coral" /><StatCard icon={Trophy} label="Questions loaded" value={questionsQuery.data?.length || 0} detail="From the 1 Timothy question bank" /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Live board</p><h2 className="mt-1 font-display text-xl font-bold">{question ? `Question ${question.questionNumber}` : 'Waiting for the first question'}</h2></div>{current && <StatusPill label={current.questionStatus || status} tone={status === 'QUESTION_LIVE' ? 'live' : status === 'ANSWER_REVEALED' ? 'success' : 'muted'} dot={status === 'QUESTION_LIVE'} />}</div>
        {question ? <div className="mt-5 rounded-2xl border border-primary/20 bg-[hsl(238_38%_9%/.7)] p-5 md:p-7"><div className="flex flex-wrap items-center gap-2 text-xs font-bold text-primary"><span>1 TIMOTHY · CHAPTER {question.chapter}</span><span className="text-muted-foreground">/</span><span>{question.points} points</span></div><p className="mt-5 max-w-3xl font-display text-2xl font-semibold leading-snug md:text-3xl">{question.question}</p><div className="mt-6 grid gap-3 md:grid-cols-2">{question.options.map((option, index) => <div key={option} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${current.correctAnswer === option ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' : 'border-border bg-secondary/40'}`}><span className="grid h-7 w-7 place-items-center rounded-lg bg-secondary font-display text-xs font-bold text-primary">{String.fromCharCode(65 + index)}</span>{option}{current.correctAnswer === option && <Check size={16} className="ml-auto" />}</div>)}</div></div> : <div className="mt-5 grid min-h-60 place-items-center rounded-2xl border border-dashed border-border text-center"><div><Sparkles className="mx-auto text-primary" size={28} /><p className="mt-3 font-semibold">Start the quiz when all teams are ready.</p><p className="mt-1 text-sm text-muted-foreground">The first question will appear on every team board.</p></div></div>}
        <div className="mt-5 flex flex-wrap gap-2">{status === 'QUESTION_LIVE' && <Button variant="secondary" onClick={() => action(close)} disabled={close.isPending} data-testid="button-close-answers"><XCircle size={16} /> Close answers</Button>}{status === 'ANSWERS_CLOSED' && <Button variant="coral" onClick={() => action(reveal)} disabled={reveal.isPending} data-testid="button-reveal-answer"><Zap size={16} /> Reveal answer</Button>}{status === 'ANSWER_REVEALED' && <Button variant="primary" onClick={() => action(leaderboard)} disabled={leaderboard.isPending} data-testid="button-show-leaderboard"><Trophy size={16} /> Show leaderboard</Button>}{status === 'LEADERBOARD' && <Button onClick={() => action(next)} disabled={next.isPending} data-testid="button-next-question"><ChevronRight size={16} /> Next question</Button>}{status !== 'WAITING' && status !== 'FINISHED' && <Button variant="danger" onClick={() => action(finish)} disabled={finish.isPending} data-testid="button-finish-quiz"><CheckCircle2 size={16} /> Finish quiz</Button>}</div>
      </section>
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Standings</p><h2 className="mt-1 font-display text-xl font-bold">Leaderboard</h2></div><Trophy className="text-primary" size={20} /></div><div className="mt-5 space-y-2">{(current?.leaderboard || teams.map((t) => ({ teamId: t.id, teamName: t.teamName, score: t.score, rank: 0 })).sort((a, b) => b.score - a.score)).slice(0, 5).map((entry, index) => <div key={entry.teamId} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3" data-testid={`row-leaderboard-${entry.teamId}`}><span className={`grid h-8 w-8 place-items-center rounded-lg font-display text-sm font-bold ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{entry.rank || index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.teamName}</span><span className="font-display text-lg font-bold text-primary">{entry.score}</span></div>)}{!teams.length && <p className="py-10 text-center text-sm text-muted-foreground">Add teams to see standings.</p>}</div></section>
    </div>
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="eyebrow">Room roster</p><h2 className="mt-1 font-display text-xl font-bold">Teams in this session</h2></div><Button variant="secondary" onClick={() => { setEditing(null); setTeamForm({ teamName: '', username: '', password: '' }); setTeamModal(true); }} data-testid="button-add-team"><Plus size={16} /> Add team</Button></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{teams.map((team) => <div key={team.id} className="rounded-xl border border-border bg-secondary/25 p-4" data-testid={`card-team-${team.id}`}><div className="flex items-start justify-between"><div><p className="font-display font-bold">{team.teamName}</p><p className="mt-1 text-xs text-muted-foreground">@{team.username}</p></div><span className={`h-2.5 w-2.5 rounded-full ${team.online ? 'bg-emerald-300 shadow-[0_0_12px_hsl(160_70%_60%/.6)]' : 'bg-muted-foreground/40'}`} /></div><div className="mt-4 flex items-center justify-between text-xs"><span className={team.answered ? 'text-emerald-300' : 'text-muted-foreground'}>{team.answered ? 'Answer submitted' : 'Thinking…'}</span><span className="font-display text-xl font-bold text-primary">{team.score}</span></div><div className="mt-3 flex gap-2"><button className="focus-ring flex-1 rounded-lg border border-border px-2 py-2 text-xs font-bold text-muted-foreground transition hover:border-primary/50 hover:text-primary" onClick={() => openEdit(team)} data-testid={`button-edit-team-${team.id}`}>Edit</button><button className="focus-ring rounded-lg border border-destructive/25 px-2 py-2 text-xs font-bold text-destructive transition hover:bg-destructive/10" onClick={() => window.confirm(`Deactivate ${team.teamName}?`) && deactivate.mutate({ teamId: team.id }, { onSuccess: () => { teamsQuery.refetch(); setFeedback('Team deactivated.'); }, onError: () => setFeedback('Could not deactivate team.') })} data-testid={`button-deactivate-team-${team.id}`}>Remove</button></div></div>)}</div></section>
    {teamModal && <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(238_38%_4%/.78)] p-5 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl animate-rise"><div className="flex items-start justify-between"><div><p className="eyebrow">{editing ? 'Edit roster entry' : 'New roster entry'}</p><h2 className="mt-1 font-display text-2xl font-bold">{editing ? 'Update team' : 'Add a team'}</h2></div><button className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => setTeamModal(false)} data-testid="button-close-team-modal"><X size={18} /></button></div><form onSubmit={submitTeam} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Team name<input required value={teamForm.teamName} onChange={(e) => setTeamForm({ ...teamForm, teamName: e.target.value })} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-secondary px-3 outline-none focus:border-primary" data-testid="input-team-name" /></label><label className="block text-sm font-semibold">Username<input required value={teamForm.username} onChange={(e) => setTeamForm({ ...teamForm, username: e.target.value })} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-secondary px-3 outline-none focus:border-primary" data-testid="input-team-username" /></label><label className="block text-sm font-semibold">Password {editing && <span className="font-normal text-muted-foreground">(leave blank to keep)</span>}<input required={!editing} minLength={4} type="password" value={teamForm.password} onChange={(e) => setTeamForm({ ...teamForm, password: e.target.value })} className="focus-ring mt-2 h-11 w-full rounded-xl border border-input bg-secondary px-3 outline-none focus:border-primary" data-testid="input-team-password" /></label><Button type="submit" className="w-full" disabled={create.isPending || update.isPending}>{editing ? 'Save changes' : 'Create team'}</Button></form></div></div>}
  </main></Shell>;
}

function AdminLoading() { return <Shell variant="admin"><main className="mx-auto max-w-[1440px] space-y-5 px-5 py-8 md:px-8"><div className="skeleton h-12 w-2/3 rounded-xl" /><div className="grid gap-4 sm:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div><div className="skeleton h-96 rounded-2xl" /></main></Shell>; }

function TeamPage() {
  const [, setLocation] = useLocation();
  const user = useGetCurrentUser();
  const quizQuery = useGetCurrentQuiz({ query: { refetchInterval: 3000, queryKey: ['/api/quiz/current'] } });
  const submit = useSubmitAnswer();
  const [selected, setSelected] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [now, setNow] = useState(Date.now());
  useQuizRealtime('team');
  useEffect(() => { if (user.data && user.data.role !== 'team') setLocation('/admin/dashboard'); }, [user.data, setLocation]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  const quiz = quizQuery.data; const question = quiz?.currentQuestion;
  const deadline = quiz?.answerDeadline ? new Date(quiz.answerDeadline).getTime() : 0;
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const myTeam = quiz?.teams?.find((team) => team.teamId === user.data?.teamId);
  useEffect(() => { setSelected(''); setSubmitted(false); }, [quiz?.currentQuestionIndex]);
  const alreadyAnswered = submitted || Boolean(myTeam?.answered);
  const canAnswer = quiz?.questionStatus === 'ACCEPTING' && seconds !== 0 && !alreadyAnswered;
  const send = () => { if (!selected || !question || !canAnswer) return; submit.mutate({ data: { questionId: question.id, selectedAnswer: selected } }, { onSuccess: () => setSubmitted(true) }); };
  if (user.isLoading || quizQuery.isLoading) return <TeamLoading />;
  return <div className="min-h-[100dvh] bg-[hsl(238_38%_9%)]"><header className="border-b border-border/70 bg-[hsl(238_38%_9%/.8)] px-4 py-4 backdrop-blur-xl"><div className="mx-auto flex max-w-3xl items-center justify-between"><Logo /><div className="flex items-center gap-2"><span className="hidden text-xs font-semibold text-muted-foreground sm:inline">{user.data?.teamName}</span><button className="focus-ring rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" onClick={() => { localStorage.removeItem('timothy_token'); setAuthTokenGetter(null); setLocation('/'); }} data-testid="button-team-logout"><LogOut size={16} /></button></div></div></header>
    <main className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{quizQuery.isError && <ConnectionNotice error onRetry={() => quizQuery.refetch()} />}{quiz?.status === 'FINISHED' ? <TeamFinished leaderboard={quiz.leaderboard} teamId={user.data?.teamId} /> : quiz?.status === 'WAITING' || !quiz ? <WaitingRoom teamName={user.data?.teamName} teams={quiz?.teams} /> : <><div className="mb-5 flex items-center justify-between"><div><p className="eyebrow">Live round · {quiz.currentQuestionIndex + 1} of {quiz.totalQuestions}</p><h1 className="mt-1 font-display text-2xl font-bold">{user.data?.teamName || 'Your team'}</h1></div>{seconds !== null && <div className={`grid h-16 w-16 place-items-center rounded-2xl border font-display text-xl font-bold ${seconds <= 10 ? 'border-accent bg-accent/10 text-accent' : 'border-primary/30 bg-primary/10 text-primary'}`} data-testid="text-countdown">{seconds}s</div>}</div>
     <section className="rounded-3xl border border-border bg-card p-5 shadow-2xl sm:p-8">
       <div className="flex flex-wrap items-center justify-between gap-2">
         <span className="inline-flex items-center gap-2 text-xs font-bold text-primary"><span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10">{quiz.currentQuestionIndex + 1}</span> 1 TIMOTHY · CHAPTER {question?.chapter}</span>
         <StatusPill label={quiz.questionStatus === 'ACCEPTING' ? 'answers open' : quiz.status === 'LEADERBOARD' ? 'leaderboard' : quiz.questionStatus?.toLowerCase() || 'syncing'} tone={quiz.questionStatus === 'ACCEPTING' ? 'live' : quiz.questionStatus === 'REVEALED' ? 'success' : 'muted'} dot={quiz.questionStatus === 'ACCEPTING'} />
       </div>
       <h2 className="mt-7 font-display text-2xl font-semibold leading-snug sm:text-3xl" data-testid="text-current-question">{question?.question || 'Waiting for the next question…'}</h2>
       {question && quiz.questionStatus !== 'REVEALED' && quiz.status !== 'LEADERBOARD' && <div className="mt-7 grid gap-3">{question.options.map((option, index) => <button key={option} disabled={!canAnswer} onClick={() => setSelected(option)} className={`focus-ring flex min-h-14 items-center gap-3 rounded-2xl border p-3 text-left text-sm font-semibold transition duration-200 ${selected === option ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(41_91%_61%/.35)]' : 'border-border bg-secondary/35 text-foreground hover:border-primary/50 hover:bg-secondary'} disabled:cursor-not-allowed disabled:opacity-55`} data-testid={`button-answer-${index}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-display text-xs font-bold ${selected === option ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{String.fromCharCode(65 + index)}</span><span className="flex-1">{option}</span>{selected === option && <Check size={17} />}</button>)}</div>}
       {quiz.questionStatus === 'REVEALED' && <RevealCard correctAnswer={quiz.correctAnswer} myTeam={myTeam} />}
       {quiz.status === 'LEADERBOARD' && <MiniLeaderboard entries={quiz.leaderboard} teamId={user.data?.teamId} />}
       {quiz.questionStatus === 'ACCEPTING' && <Button onClick={send} disabled={!selected || !canAnswer || submit.isPending} className="mt-7 w-full" data-testid="button-submit-answer">{submit.isPending ? 'Sending answer…' : alreadyAnswered ? 'Answer locked in' : 'Lock in answer'} <Check size={16} /></Button>}
       {alreadyAnswered && quiz.questionStatus === 'ACCEPTING' && <p className="mt-3 text-center text-xs font-semibold text-emerald-300" data-testid="status-answer-submitted">Your answer is with the quiz master. Stay ready.</p>}
     </section></>}</main>
  </div>;
}

function WaitingRoom({ teamName, teams = [] }) { return <div className="grid min-h-[70dvh] place-items-center py-8"><section className="w-full text-center"><div className="mx-auto grid h-28 w-28 place-items-center rounded-full border border-primary/30 bg-primary/5 animate-pulse-ring"><div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10"><Radio size={32} className="text-primary" /></div></div><p className="eyebrow mt-8">Room is getting ready</p><h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Welcome, {teamName || 'team'}.</h1><p className="mx-auto mt-4 max-w-md leading-7 text-muted-foreground">The quiz master will open the first question soon. Keep this screen open and stay with your team.</p><div className="mx-auto mt-9 max-w-sm rounded-2xl border border-border bg-card p-4 text-left"><div className="flex items-center justify-between text-xs font-bold"><span className="text-muted-foreground">Teams in the room</span><span className="text-primary">{teams.length || 0} connected</span></div><div className="mt-4 flex gap-2">{teams.slice(0, 4).map((team) => <div key={team.teamId} className="flex-1 rounded-xl border border-border bg-secondary/40 p-3"><div className={`mb-2 h-2 w-2 rounded-full ${team.answered ? 'bg-emerald-300' : 'bg-primary'}`} /><p className="truncate text-xs font-semibold">{team.teamName}</p></div>)}</div></div></section></div>; }
function RevealCard({ correctAnswer, myTeam }) { const correct = myTeam?.isCorrect; return <div className={`mt-7 rounded-2xl border p-5 ${correct ? 'border-emerald-400/30 bg-emerald-400/10' : 'border-accent/30 bg-accent/10'}`} data-testid="card-answer-reveal"><div className="flex items-start gap-3">{correct ? <CheckCircle2 className="text-emerald-300" /> : <XCircle className="text-accent" />}<div><p className="eyebrow" style={{ color: 'inherit' }}>Answer revealed</p><p className="mt-1 font-display text-xl font-bold">{correctAnswer || 'The quiz master is revealing the answer.'}</p><p className="mt-2 text-sm text-muted-foreground">{correct ? `Great work — +${myTeam.pointsAwarded} points.` : 'Keep your heads up. The next question is yours.'}</p></div></div></div>; }
function MiniLeaderboard({ entries = [], teamId }) { return <div className="mt-7 rounded-2xl border border-border bg-secondary/30 p-4"><div className="flex items-center gap-2 text-sm font-bold"><Trophy className="text-primary" size={17} /> Current standings</div><div className="mt-3 space-y-2">{entries.slice(0, 4).map((entry) => <div key={entry.teamId} className={`flex items-center gap-3 rounded-lg p-2 text-sm ${entry.teamId === teamId ? 'bg-primary/10 text-primary' : ''}`}><span className="w-5 font-display font-bold text-muted-foreground">{entry.rank}</span><span className="flex-1 font-semibold">{entry.teamName}</span><span className="font-display font-bold">{entry.score}</span></div>)}</div></div>; }
function TeamFinished({ leaderboard = [], teamId }) { return <div className="py-12 text-center"><Crown className="mx-auto text-primary" size={40} /><p className="eyebrow mt-7">Final standings</p><h1 className="mt-2 font-display text-4xl font-bold">Well played.</h1><p className="mt-3 text-muted-foreground">The quiz master has closed this room.</p><div className="mx-auto mt-8 max-w-md rounded-2xl border border-border bg-card p-4 text-left"><MiniLeaderboard entries={leaderboard} teamId={teamId} /></div></div>; }
function TeamLoading() { return <div className="min-h-[100dvh] bg-[hsl(238_38%_9%)] p-5"><div className="mx-auto max-w-3xl"><div className="skeleton h-12 w-40 rounded-xl" /><div className="skeleton mt-12 h-[420px] rounded-3xl" /></div></div>; }

function Router() { return <ErrorBoundary><Switch><Route path="/" component={Home} /><Route path="/admin/login" component={() => <AuthPage admin />} /><Route path="/admin/dashboard" component={AdminDashboard} /><Route path="/login" component={AuthPage} /><Route path="/team" component={TeamPage} /><Route component={NotFound} /></Switch></ErrorBoundary>; }
function App() { return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>; }
export default App;