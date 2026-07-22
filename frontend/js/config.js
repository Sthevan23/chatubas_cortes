/**
 * Configuração do frontend.
 *
 * Local: usa localhost:3000.
 * Produção: o script prepare-hostinger gera js/config.js com as URLs do deploy.config.json
 * ou defina window.APP_CONFIG_OVERRIDE antes deste arquivo.
 */
(function () {
  const override =
    typeof window.APP_CONFIG_OVERRIDE === "string"
      ? { API_BASE_URL: window.APP_CONFIG_OVERRIDE }
      : window.APP_CONFIG_OVERRIDE && typeof window.APP_CONFIG_OVERRIDE === "object"
        ? window.APP_CONFIG_OVERRIDE
        : null;

  const defaults = {
    API_BASE_URL: "http://localhost:3000",
    SITE_URL: "",
    PAINEL_URL: "",
  };

  window.APP_CONFIG = Object.assign({}, defaults, override || {});
})();
