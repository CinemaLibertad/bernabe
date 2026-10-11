export default function SettingsPage() {
  return <main className="panel-main">
    <div className="breadcrumbs">Inicio / <b>Configuración</b></div>
    <header className="domain-heading">
      <div>
        <span className="agenda-eyebrow">PREFERENCIAS DEL ESTUDIO</span>
        <h1>Configuración</h1>
        <p>Accesibilidad, visualización y preferencias generales del panel.</p>
      </div>
    </header>
    <section className="data-card" aria-labelledby="settings-preparation-title">
      <h2 id="settings-preparation-title">Preferencias del panel</h2>
      <p>Esta sección centralizará las opciones de accesibilidad y personalización. Los controles se incorporarán cuando esté definido su comportamiento.</p>
    </section>
  </main>;
}
