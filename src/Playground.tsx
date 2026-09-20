import { useCallback, useEffect, useRef, useState } from "react";

type PresentationData = {
  title: string;
  content: string;
};

type PresentationWindow = Window & {
  getScreenDetails?: () => Promise<ScreenDetails>;
};

type ScreenDetails = {
  screens: ScreenInfo[];
  currentScreen: ScreenInfo;
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
};

type ScreenInfo = {
  left: number;
  top: number;
  width: number;
  height: number;
  isPrimary: boolean;
  isCurrent: boolean;
};

export function PlayGround() {
  const presentationWindowRef = useRef<Window | null>(null);

  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [hasMultipleScreens, setHasMultipleScreens] = useState(false);
  const [presentationData, setPresentationData] = useState<PresentationData>({
    title: "Welcome",
    content: "Welcome to the presentation",
  });

  /**
   * Detect whether the browser can see multiple displays.
   */
  const detectDisplays = useCallback(async () => {
    const browserWindow = window as PresentationWindow;

    if (!browserWindow.getScreenDetails) {
      setHasMultipleScreens(false);
      return;
    }

    try {
      const screenDetails = await browserWindow.getScreenDetails();

      setHasMultipleScreens(screenDetails.screens.length > 1);
    } catch {
      setHasMultipleScreens(false);
    }
  }, []);

  useEffect(() => {
    void detectDisplays();
  }, [detectDisplays]);

  /**
   * Open the presentation window.
   */
  const openPresentation = useCallback(async () => {
    const browserWindow = window as PresentationWindow;

    /**
     * If the browser supports multi-screen detection,
     * request access to the available displays.
     */
    if (browserWindow.getScreenDetails) {
      try {
        const screenDetails = await browserWindow.getScreenDetails();

        const externalScreen = screenDetails.screens.find(
          (screen) => !screen.isPrimary,
        );

        if (externalScreen) {
          const features = [
            `left=${externalScreen.left}`,
            `top=${externalScreen.top}`,
            `width=${externalScreen.width}`,
            `height=${externalScreen.height}`,
            "popup=yes",
          ].join(",");

          const presentationWindow = window.open(
            "/presentation",
            "presentation-window",
            features,
          );

          if (presentationWindow) {
            presentationWindowRef.current = presentationWindow;
            setIsPresentationOpen(true);
          }

          return;
        }
      } catch {
        // Fall back to normal popup behaviour.
      }
    }

    /**
     * Fallback for browsers without multi-screen support.
     *
     * The user can manually drag this window to the TV display.
     */
    const presentationWindow = window.open(
      "/presentation",
      "presentation-window",
      "popup=yes,width=1920,height=1080",
    );

    if (presentationWindow) {
      presentationWindowRef.current = presentationWindow;
      setIsPresentationOpen(true);
    }
  }, []);

  /**
   * Send updated presentation content to the external window.
   */
  useEffect(() => {
    const presentationWindow = presentationWindowRef.current;

    if (!presentationWindow || presentationWindow.closed) {
      return;
    }

    presentationWindow.postMessage(
      {
        type: "PRESENTATION_UPDATE",
        payload: presentationData,
      },
      window.location.origin,
    );
  }, [presentationData]);

  /**
   * Close presentation window.
   */
  const closePresentation = useCallback(() => {
    const presentationWindow = presentationWindowRef.current;

    if (presentationWindow && !presentationWindow.closed) {
      presentationWindow.close();
    }

    presentationWindowRef.current = null;
    setIsPresentationOpen(false);
  }, []);

  /**
   * Update what is being displayed.
   */
  const updatePresentation = useCallback((data: PresentationData) => {
    setPresentationData(data);
  }, []);

  return (
    <div>
      <div>
        <strong>External displays:</strong>{" "}
        {hasMultipleScreens ? "Detected" : "Not detected"}
      </div>

      {!isPresentationOpen ? (
        <button onClick={() => void openPresentation()}>
          Start Presentation
        </button>
      ) : (
        <button onClick={closePresentation}>Stop Presentation</button>
      )}

      <div>
        <button
          onClick={() =>
            updatePresentation({
              title: "Slide 1",
              content: "Welcome to today's presentation",
            })
          }
        >
          Slide 1
        </button>

        <button
          onClick={() =>
            updatePresentation({
              title: "Slide 2",
              content: "This content is now being displayed",
            })
          }
        >
          Slide 2
        </button>
      </div>
    </div>
  );
}
