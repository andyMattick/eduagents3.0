import styles from "./Button.module.css";

export function Button({ variant = "default", className = "", ...props }) {
  const variantClass =
    variant === "primary"
      ? styles.primary
      : variant === "outline"
      ? styles.outline
      : "";

  return (
    <button className={`${styles.button} ${variantClass} ${className}`} {...props} />
  );
}
