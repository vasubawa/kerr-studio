import FIELD_FRAG from "./field.frag";
import GEODESIC_SHELL from "./geodesic.frag";
import ADAPTIVE_SHELL from "./adaptive.frag";
import TRACE_GLSL from "./trace.glsl";
import VOLUME_FRAG from "./volume.frag";
import BLUR_FRAG from "./blur.frag";
import COMPOSITE_FRAG from "./composite.frag";

function withTrace(shell: string): string {
  // WebGL has no #include. Strip the IDE-only include directive, then inline.
  return shell
    .replace(/^[ \t]*#extension\s+GL_GOOGLE_include_directive\s*:\s*\w+[ \t]*$/m, "")
    .replace(/^[ \t]*#include\s+"trace\.glsl"[ \t]*$/m, TRACE_GLSL);
}

const GEODESIC_FRAG = withTrace(GEODESIC_SHELL);
const ADAPTIVE_FRAG = withTrace(ADAPTIVE_SHELL);

export { FIELD_FRAG, GEODESIC_FRAG, ADAPTIVE_FRAG, VOLUME_FRAG, BLUR_FRAG, COMPOSITE_FRAG };
