/**
 * Открыть окно с понятной ошибкой вместо «ничего не произошло».
 * @param {() => object} factory  создаёт приложение
 */
export async function openApp(factory, label = "") {
  try {
    const app = await factory();
    await app.render({ force: true });
    return app;
  } catch (err) {
    console.error(`genesys-rpg | ${label}`, err);
    ui.notifications.error(`Genesys: ${label ? `${label}: ` : ""}${err.message}`, { permanent: true });
    return null;
  }
}
