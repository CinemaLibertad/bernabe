"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import GoogleDriveStorageCard from "@/components/settings/GoogleDriveStorageCard";
import OneDriveStorageCard from "@/components/settings/OneDriveStorageCard";

const sections = [
  ["identity", "Identidad del estudio", "business"],
  ["professionals", "Profesionales y matrículas", "badge"],
  ["team", "Equipo y permisos", "group"],
  ["documents", "Documentos y membretes", "description"],
  ["storage", "Almacenamiento e integraciones", "cloud_sync"],
  ["devices", "App móvil y dispositivos", "devices"],
  ["appearance", "Apariencia y accesibilidad", "contrast"],
  ["security", "Seguridad y auditoría", "verified_user"],
] as const;

function Field({ label, type = "text", wide = false, placeholder }: { label: string; type?: InputHTMLAttributes<HTMLInputElement>["type"]; wide?: boolean; placeholder?: string }) {
  return <label className={`settings-field${wide ? " is-wide" : ""}`}>
    <span>{label}</span>
    <input type={type} placeholder={placeholder ?? ""} />
  </label>;
}

function TextField({ label, wide = false }: { label: string; wide?: boolean }) {
  return <label className={`settings-field${wide ? " is-wide" : ""}`}>
    <span>{label}</span>
    <textarea rows={3} />
  </label>;
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="settings-form-card">
    <header><h2>{title}</h2>{description && <p>{description}</p>}</header>
    {children}
  </section>;
}

function IdentitySection() {
  return <div className="settings-card-grid">
    <Card title="Información institucional del despacho" description="Datos registrales, domicilio y presentación del estudio.">
      <div className="settings-fields-grid">
        <Field label="Nombre comercial" wide />
        <Field label="Razón social" />
        <Field label="CUIT / identificación tributaria" />
        <Field label="Domicilio del estudio" wide />
        <Field label="Localidad" />
        <Field label="Provincia" />
        <Field label="Código postal" />
        <Field label="Teléfono institucional" />
        <Field label="Correo institucional" type="email" />
        <Field label="Sitio web oficial" type="url" />
        <TextField label="Reseña institucional para documentos" wide />
      </div>
    </Card>
    <Card title="Identidad visual" description="Incorporá la identidad que se utilizará en el espacio de trabajo y en documentos.">
      <div className="settings-fields-grid">
        <Field label="Nombre de la persona representante" wide />
        <div className="settings-upload-field settings-field is-wide">
          <span>Logotipo del estudio</span>
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" aria-label="Seleccionar logotipo del estudio" />
          <small>PNG, JPG o SVG. El archivo se incorporará al almacenamiento conectado.</small>
        </div>
      </div>
    </Card>
  </div>;
}

function ProfessionalSection() {
  return <div className="settings-card-grid">
    <Card title="Profesional responsable" description="Datos de identificación profesional y contacto. Los campos están vacíos hasta que se completen.">
      <div className="settings-fields-grid">
        <Field label="Nombre y apellido" />
        <Field label="Correo profesional" type="email" />
        <Field label="Teléfono" />
        <Field label="Domicilio profesional" wide />
      </div>
    </Card>
    <Card title="Matrículas profesionales" description="Agregá las matrículas correspondientes a cada jurisdicción.">
      <div className="settings-fields-grid settings-license-row">
        <Field label="Tipo de matrícula" placeholder="Federal, provincial u otra" />
        <Field label="Colegio / jurisdicción" />
        <Field label="Tomo" />
        <Field label="Folio / número" />
      </div>
      <p className="settings-empty-note">Aún no se cargaron matrículas.</p>
    </Card>
  </div>;
}

function TeamSection() {
  return <div className="settings-card-grid">
    <Card title="Personas autorizadas" description="Definí quién puede acceder al espacio de trabajo y qué tareas puede realizar.">
      <div className="settings-fields-grid">
        <Field label="Nombre y apellido" />
        <Field label="Correo de la cuenta autorizada" type="email" />
        <label className="settings-field"><span>Función en el estudio</span><select defaultValue=""><option value="" disabled>Seleccionar función</option><option>Profesional</option><option>Administración</option><option>Procuración</option><option>Asistencia jurídica</option></select></label>
        <label className="settings-field"><span>Permiso inicial</span><select defaultValue=""><option value="" disabled>Seleccionar permiso</option><option>Consulta</option><option>Carga y edición</option><option>Administración</option></select></label>
      </div>
      <p className="settings-empty-note">No hay integrantes adicionales cargados.</p>
    </Card>
    <Card title="Accesos autorizados" description="Los permisos se asignarán a una persona identificada, no a un dispositivo compartido.">
      <p className="settings-empty-note">Las autorizaciones se mostrarán aquí cuando se configure el acceso del equipo.</p>
    </Card>
  </div>;
}

function DocumentsSection() {
  return <div className="settings-card-grid">
    <Card title="Membrete y presentación" description="Datos que podrán incorporarse a escritos y documentos del estudio.">
      <div className="settings-fields-grid">
        <Field label="Nombre que aparecerá en el membrete" wide />
        <Field label="Domicilio para documentos" wide />
        <Field label="Teléfono de contacto" />
        <Field label="Correo de contacto" type="email" />
        <Field label="Sitio web" type="url" />
        <Field label="Formato de página" placeholder="A4 u otro" />
        <Field label="Márgenes" placeholder="Medida en centímetros" />
        <Field label="Tipografía" />
      </div>
    </Card>
    <Card title="Vista previa" description="La vista se completará con los datos institucionales ingresados.">
      <div className="settings-document-preview" aria-label="Vista previa vacía del membrete">
        <span>Vista previa del documento</span>
      </div>
    </Card>
  </div>;
}

function DevicesSection() {
  return <div className="settings-card-grid">
    <Card title="Vinculación de la aplicación móvil" description="Cada persona del estudio tendrá su propia vinculación para registrar actividad desde el teléfono.">
      <div className="settings-device-empty">
        <span className="material-symbols-outlined" aria-hidden="true">qr_code_scanner</span>
        <h3>Vinculación por QR</h3>
        <p>La activación individual estará disponible cuando integremos la aplicación móvil.</p>
      </div>
    </Card>
    <Card title="Dispositivos vinculados" description="Los dispositivos aparecerán aquí una vez que se complete su activación.">
      <p className="settings-empty-note">No hay dispositivos mostrados.</p>
    </Card>
  </div>;
}

function AppearanceSection() {
  return <div className="settings-card-grid">
    <Card title="Preferencias visuales" description="Opciones para adaptar la lectura y el uso del panel.">
      <fieldset className="settings-choice-group"><legend>Tema de interfaz</legend>
        <label><input type="radio" name="theme" value="light" /> Claro</label>
        <label><input type="radio" name="theme" value="dark" /> Oscuro</label>
        <label><input type="radio" name="theme" value="system" /> Según el dispositivo</label>
      </fieldset>
      <label className="settings-field"><span>Tamaño del texto</span><select defaultValue=""><option value="" disabled>Elegir tamaño</option><option>Pequeño</option><option>Estándar</option><option>Grande</option><option>Muy grande</option></select></label>
      <label className="settings-check"><input type="checkbox" /> Alto contraste</label>
      <label className="settings-check"><input type="checkbox" /> Reducir animaciones</label>
      <label className="settings-check"><input type="checkbox" /> Resaltar el foco del teclado</label>
    </Card>
  </div>;
}

function SecuritySection() {
  return <div className="settings-card-grid">
    <Card title="Sesión y acceso" description="Opciones de protección del acceso al panel.">
      <label className="settings-field"><span>Cierre automático por inactividad</span><select defaultValue=""><option value="" disabled>Seleccionar duración</option><option>15 minutos</option><option>30 minutos</option><option>1 hora</option></select></label>
    </Card>
    <Card title="Registro de actividad" description="Los cambios de configuración y accesos se presentarán cuando el registro esté integrado.">
      <p className="settings-empty-note">No hay actividad para mostrar.</p>
    </Card>
  </div>;
}

function StorageSection() {
  return <div className="settings-card-grid settings-storage-grid">
    <div className="settings-storage-intro"><h2>Almacenamiento en la nube</h2><p>Conectá la cuenta donde querés guardar los documentos y escaneos del estudio.</p></div>
    <GoogleDriveStorageCard />
    <OneDriveStorageCard />
  </div>;
}

const content: Record<string, () => ReactNode> = {
  identity: IdentitySection,
  professionals: ProfessionalSection,
  team: TeamSection,
  documents: DocumentsSection,
  storage: StorageSection,
  devices: DevicesSection,
  appearance: AppearanceSection,
  security: SecuritySection,
};

export default function WorkspaceSettings() {
  const [active, setActive] = useState<string>("identity");
  const ActiveSection = content[active];
  return <>
    <header className="domain-heading settings-page-heading">
      <div><span className="agenda-eyebrow">ESPACIO DE TRABAJO</span><h1>Configuración del espacio de trabajo</h1><p>Identidad del estudio, profesionales, documentos, accesos y preferencias.</p></div>
    </header>
    <nav className="settings-section-nav" aria-label="Secciones de configuración">
      {sections.map(([id, label, icon]) => <button key={id} type="button" className={active === id ? "is-active" : ""} onClick={() => setActive(id)} aria-current={active === id ? "page" : undefined}>
        <span className="material-symbols-outlined" aria-hidden="true">{icon}</span><span>{label}</span>
      </button>)}
    </nav>
    <div className="settings-active-panel" key={active}>
      <ActiveSection />
    </div>
  </>;
}
