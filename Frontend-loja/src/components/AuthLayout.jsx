import logoDayaneLima from '../assets/logo-dayane-lima-header.png';
import '../pages/login.css';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <img className="auth-logo" src={logoDayaneLima} alt="Dayane Lima Moda Feminina" />
        <header className="auth-header">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
      </section>
    </main>
  );
}
