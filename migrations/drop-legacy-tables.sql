-- Elimina de la base de datos todo lo que quedó de la plataforma de automatizaciones anterior y de sus
-- herramientas asociadas: instancias, clientes por instancia, plantillas de flujos, credenciales,
-- widgets, WhatsApp, conversaciones, claves de API, ajustes de infraestructura y la tienda antigua.
--
-- ⚠️  ESTO BORRA DATOS DE FORMA PERMANENTE. Ninguna de estas tablas la usa ya la web ni el panel.
--     Si quieres una copia antes: Supabase → Database → Backups. Idempotente (se puede repetir).
-- Pégalo en Supabase → SQL Editor → Run.

DROP TABLE IF EXISTS
  n8n_instances,
  pay_per_instance_deployments,
  client_instances,
  client_invites,
  client_widgets,
  widget_category_links,
  widget_categories,
  workflow_template_imports,
  workflow_templates,
  credential_records,
  whatsapp_instances,
  whatsapp_servers,
  conversations,
  agency_client_billing_settings,
  agency_manual_payments,
  agency_client_notes,
  agency_client_custom_entries,
  api_key,
  products,
  portal_settings
CASCADE;

DROP FUNCTION IF EXISTS public.increment_whatsapp_session_count(uuid);
DROP FUNCTION IF EXISTS public.update_updated_at();
