import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className="container">
        <h1 className={styles.title}>
          Benvenuti su <span style={{ color: 'var(--primary)' }}>PranzoVeloce</span>
        </h1>
        <p className={styles.subtitle}>
          Ottimizza la tua pausa pranzo ordinando in anticipo.
        </p>

        <div className={styles.grid}>
          <Link href="/admin" className={styles.card}>
            <h2>Ristorante 👨‍🍳 &rarr;</h2>
            <p>Gestisci il menu del giorno e visualizza gli ordini da preparare per le 12:30.</p>
          </Link>

          <Link href="/menu" className={styles.card}>
            <h2>Dipendente 💼 &rarr;</h2>
            <p>Visualizza il menu di oggi, scegli il tuo pranzo e invia l&apos;ordine.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
