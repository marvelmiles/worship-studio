export default async function clearEverything() {
  try {
    localStorage.clear();
  } catch (err) {
    console.error("Local Storage:", err);
  }

  try {
    sessionStorage.clear();
  } catch (err) {
    console.error("Session Storage:", err);
  }

  try {
    document.cookie.split(";").forEach((cookie) => {
      const eqPos = cookie.indexOf("=");
      const name =
        eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();

      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    });
  } catch (err) {
    console.error("Cookies:", err);
  }

  try {
    if ("databases" in indexedDB) {
      const databases = await (
        indexedDB as IDBFactory & {
          databases(): Promise<{ name?: string }[]>;
        }
      ).databases();

      for (const db of databases) {
        const name = db.name;
        if (!name) continue;

        await new Promise<void>((resolve) => {
          const request = indexedDB.deleteDatabase(name);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = () => {
            console.error(`❌ Failed deleting ${name}`);
            resolve();
          };

          request.onblocked = () => {
            resolve();
          };
        });
      }
    } else {
      console.warn(
        "Browser doesn't support indexedDB.databases(). Delete manually.",
      );
    }
  } catch (err) {
    console.error("IndexedDB:", err);
  }

  try {
    if ("caches" in window) {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames.map(async (cache) => {
          await caches.delete(cache);
          console.log(`✅ Deleted cache: ${cache}`);
        }),
      );
    }
  } catch (err) {
    console.error("Cache Storage:", err);
  }

  alert("All browser storage has been cleared.\nThe page will now reload.");

  window.location.replace(window.location.pathname);
}
