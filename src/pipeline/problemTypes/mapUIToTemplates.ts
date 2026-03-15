import { getPlugins } from "../agents/pluginEngine/services/pluginRegistry";
import { getSupportsForUIProblemType } from "./mapUIToSupports";

export function getCandidateTemplatesForUIProblemType(id: string) {
  const supports = getSupportsForUIProblemType(id);
  const plugins = getPlugins();

  return plugins.filter((plugin) => {
    if (plugin.generationType !== "template") return false;
    const t = plugin.template;
    if (!t || !t.supports) return false;

    return supports.some((s) => t.supports?.[s] === true);

  });
}
