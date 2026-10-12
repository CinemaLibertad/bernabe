import OneDriveStorageCard from "@/components/settings/OneDriveStorageCard";
import GoogleDriveStorageCard from "@/components/settings/GoogleDriveStorageCard";

export default function SettingsPage() {
  return <main className="panel-main">
    <div className="breadcrumbs">Inicio / <b>Configuración</b></div>
    <header className="domain-heading settings-page-heading">
      <div>
        <span className="agenda-eyebrow">ESPACIO DE TRABAJO</span>
        <h1>Configuración del estudio</h1>
        <p>Administrá el almacenamiento y las preferencias del entorno de trabajo.</p>
      </div>
    </header>
    <nav className="settings-section-nav" aria-label="Secciones de configuración">
      <a className="is-active" href="#almacenamiento" aria-current="location">Almacenamiento e integraciones</a>
      <a href="#preferencias">Preferencias del panel</a>
    </nav>
    <section className="settings-storage-section" aria-labelledby="settings-storage-title">
      <div className="settings-storage-heading" id="almacenamiento">
        <span className="agenda-eyebrow">DOCUMENTOS DEL ESTUDIO</span>
        <h2 id="settings-storage-title">Conectá tu almacenamiento en la nube</h2>
        <p>Elegí una cuenta propia para guardar los documentos y escaneos del estudio.</p>
      </div>
      <GoogleDriveStorageCard />
      <OneDriveStorageCard />
    </section>
    <section className="data-card settings-preferences-card" id="preferencias" aria-labelledby="settings-preparation-title">
      <span className="agenda-eyebrow">ENTORNO DE TRABAJO</span>
      <h2 id="settings-preparation-title">Preferencias del panel</h2>
      <p>Esta sección centralizará las opciones de accesibilidad y personalización. Los controles se incorporarán cuando esté definido su comportamiento.</p>
    </section>
  </main>;
}
