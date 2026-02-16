import styles from "./Label.module.css";
import { LabelHTMLAttributes } from "react";

export function Label(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={styles.label} {...props} />;
}
