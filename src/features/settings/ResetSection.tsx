import { useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useUITheme } from "../../theme/ThemeProvider";
import { fade } from "../../theme/uiTheme";
import { useStore } from "../../store/useStore";
import { Button } from "../../components/ui/Button";
import { InfoTip } from "../../components/ui/InfoTip";
import { SectionTitle, TextInput } from "../../components/ui/Field";
import { Modal } from "../../components/ui/Modal";
import { MAX_KEPT_ITEMS } from "../../lib/keepOnReset";
import { APP_NAME } from "../../lib/appInfo";

const RESET_PHRASE = "ResetApp";

export const ResetSection = ({
  keptItems,
  onBeforeReset,
}: {
  keptItems: string[];
  onBeforeReset: () => void;
}) => {
  const { colors, fonts } = useUITheme();
  const resetApp = useStore((s) => s.resetApp);
  const [isConfirming, setIsConfirming] = useState(false);
  const [typedPhrase, setTypedPhrase] = useState("");

  return (
    <>
      <SectionTitle
        info={
          <InfoTip title="Reset">
            Restore {APP_NAME} to its original state, exactly like the first
            time you opened it.{" "}
            {keptItems.length > 0
              ? `${keptItems.length} of ${MAX_KEPT_ITEMS} "keep on reset" slots are in use, and those items will survive.`
              : `Manuscripts and custom themes you mark "Keep on reset" (up to ${MAX_KEPT_ITEMS}) survive this.`}
          </InfoTip>
        }
      >
        Reset
      </SectionTitle>
      <Button
        variant="danger"
        onClick={() => {
          setTypedPhrase("");
          setIsConfirming(true);
        }}
      >
        <RotateCcw size={15} />
        Reset App to Defaults
      </Button>

      {isConfirming && (
        <Modal
          open
          onClose={() => setIsConfirming(false)}
          title="Reset everything?"
          width={480}
          footer={
            <>
              <Button onClick={() => setIsConfirming(false)}>Cancel</Button>
              <Button
                variant="danger"
                disabled={typedPhrase.trim() !== RESET_PHRASE}
                onClick={async () => {
                  setIsConfirming(false);
                  onBeforeReset();
                  await resetApp();
                }}
              >
                Reset everything
              </Button>
            </>
          }
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: 14,
              borderRadius: 11,
              background: fade(colors.danger, 0.1),
              border: `1px solid ${fade(colors.danger, 0.3)}`,
              marginBottom: 16,
            }}
          >
            <AlertTriangle
              size={20}
              color={colors.danger}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <div
              style={{
                fontFamily: fonts.ui,
                fontSize: 13.5,
                color: colors.text,
                lineHeight: 1.6,
              }}
            >
              This permanently deletes{" "}
              <strong>
                all your manuscripts, custom themes, backgrounds, audio, and
                settings
              </strong>
              , and restores the built-in defaults. You&apos;ll be treated as a
              first-time user again. This can&apos;t be undone, so export a
              backup first if you want to keep anything.
              {keptItems.length > 0 && (
                <>
                  {" "}
                  The {keptItems.length} item
                  {keptItems.length === 1 ? "" : "s"} you marked{" "}
                  <strong>Keep on reset</strong> will survive:{" "}
                  {keptItems.join(", ")}.
                </>
              )}
            </div>
          </div>
          <p
            style={{
              fontFamily: fonts.ui,
              fontSize: 13.5,
              color: colors.sub,
              margin: "0 0 8px",
              lineHeight: 1.6,
            }}
          >
            Type{" "}
            <code style={{ textTransform: "none", color: colors.text }}>
              {RESET_PHRASE}
            </code>{" "}
            below to confirm (case-sensitive).
          </p>
          <TextInput
            value={typedPhrase}
            placeholder={RESET_PHRASE}
            onChange={(event) => setTypedPhrase(event.target.value)}
          />
        </Modal>
      )}
    </>
  );
};
