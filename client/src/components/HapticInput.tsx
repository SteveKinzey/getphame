/**
 * HapticInput — drop-in replacement for <input name="rr-components-haptic-input-field-2"> and <textarea name="rr-components-haptic-input-field-2"> that fires
 * a light keyPress haptic on every keystroke, respecting the user's
 * hapticEnabled preference from useHaptics().
 *
 * Usage:
 *   import HapticInput from "@/components/HapticInput";
 *   <HapticInput className="..." value={v} onChange={...} />
 *   <HapticInput as="textarea" className="..." value={v} onChange={...} />
 */

import React from "react";
import { useHaptics } from "@/hooks/useHaptics";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  as?: "input";
};

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  as: "textarea";
};

type HapticInputProps = InputProps | TextareaProps;

const HapticInput = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  HapticInputProps
>((props, ref) => {
  const { keyPressHaptic } = useHaptics();

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    // Only buzz on printable characters + backspace/delete — not modifier keys
    const isPrintable = e.key.length === 1;
    const isEdit = ["Backspace", "Delete"].includes(e.key);
    if (isPrintable || isEdit) {
      keyPressHaptic();
    }
    // Forward original handler
    if (props.as === "textarea") {
      (props as TextareaProps).onKeyDown?.(
        e as React.KeyboardEvent<HTMLTextAreaElement>
      );
    } else {
      (props as InputProps).onKeyDown?.(
        e as React.KeyboardEvent<HTMLInputElement>
      );
    }
  };

  if (props.as === "textarea") {
    const { as: _as, ...rest } = props as TextareaProps;
    return (
      <textarea
        {...rest}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        onKeyDown={handleKeyDown as React.KeyboardEventHandler<HTMLTextAreaElement>}
       name="rr-components-haptic-input-field-55" />
    );
  }

  const { as: _as, ...rest } = props as InputProps;
  return (
    <input
      {...rest}
      ref={ref as React.Ref<HTMLInputElement>}
      onKeyDown={handleKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
     name="rr-components-haptic-input-field-65" />
  );
});

HapticInput.displayName = "HapticInput";

export default HapticInput;
