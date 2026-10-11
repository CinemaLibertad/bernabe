# Catálogo Judicial Nacional

Datos públicos extraídos de la [Guía Judicial del Consejo de la Magistratura](https://consejomagistratura.gov.ar/guiajudicial/). La estructura conserva IDs estables, jerarquía del directorio, enlaces, contactos, coordenadas, autoridades cuando la fuente pública las entrega y procedencia por registro/campo. Un dato no publicado queda vacío y se informa en `processed/coverage.json`.

## Archivos

- `sources/consejo-magistratura-guiajudicial.html`: copia de la página fuente; se redactó únicamente la clave de Google Maps que estaba expuesta en el HTML.
- `sources/consejo-magistratura-integrantes.jsonl`: respuestas públicas del diálogo «Integrantes», una por registro consultado.
- `sources/source-manifest.json`: URL, fecha y hash SHA-256 del HTML recibido antes de redactar su clave.
- `processed/organismos.json`: catálogo normalizado completo.
- `processed/search-index.json`: proyección de texto normalizada para indexación.
- `processed/jurisdicciones.json`: jurisdicciones que aparecen explícitamente en esta fuente.
- `processed/coverage.json`: recuentos y campos incompletos.
- `processed/catalogo-judicial-d1-import.sql`: carga idempotente de entidades, contactos, fuentes, relaciones, autoridades, procedencia e índice FTS.
- `scripts/import-judicial-catalog-d1.mjs`: divide la carga en lotes remotos acotados y reintentables; requiere confirmación explícita.

## Reprocesar la fuente guardada

```powershell
node scripts/import-judicial-guide.mjs
node scripts/build-d1-catalog-import.mjs
```

La consulta del cuadro «Integrantes» es una operación adicional sobre el endpoint público que la misma página usa al abrir ese cuadro. El importador de esa fuente es `scripts/enrich-judicial-officials.mjs`; su ejecución vuelve a consultar los 1.446 IDs que exponen esa opción.

## Carga en D1

Con Wrangler ya disponible y autenticado para la cuenta Cloudflare:

```powershell
wrangler d1 execute catalogo-judicial-nacional --remote --file=cloudflare/catalog-api/migrations/0002_organization_coordinates.sql
node scripts/import-judicial-catalog-d1.mjs --confirm-remote
```

Después de una reimportación, incrementar `CACHE_VERSION` en `cloudflare/catalog-api/src/index.js` y desplegar el Worker para que respuestas cacheadas anteriores no oculten los datos actualizados.

El primer comando agrega latitud/longitud al esquema existente; el segundo carga el catálogo y reconstruye su índice de búsqueda. Las escrituras son reejecutables por ID estable. El segundo comando sustituye el índice FTS derivado para reconstruirlo desde los datos importados.

## Alcance

La fuente contiene organismos nacionales y federales representados en la Guía Judicial. No equivale al conjunto de los poderes judiciales provinciales. Los cargos se importan tal como los devuelve el directorio; no se presentan como verificados independientemente. La incorporación de fuentes provinciales debe conservar su propia procedencia y normalizarse sobre el mismo contrato.
