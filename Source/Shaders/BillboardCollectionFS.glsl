#ifdef GL_EXT_frag_depth
#extension GL_EXT_frag_depth : enable
#endif

uniform sampler2D u_atlas;

varying vec2 v_textureCoordinates;

#ifdef RENDER_FOR_PICK
varying vec4 v_pickColor;
#else
varying vec4 v_color;
#endif

void main()
{
#ifdef RENDER_FOR_PICK
    vec4 vertexColor = vec4(1.0, 1.0, 1.0, 1.0);
#else
    vec4 vertexColor = v_color;
#endif

    vec4 sourceColor = texture2D(u_atlas, v_textureCoordinates);
    vec4 color = sourceColor * vertexColor;
    if (color.a == 0.0)
    {
        discard;
    }

#ifdef GL_EXT_frag_depth
    // TODO: Add WRITE_DEPTH switch and hook up to user option!
    float z = gl_FragCoord.z;
    gl_FragDepthEXT = z + ((1.0 - z) * (1.0 - sourceColor.a));
#endif
    
#ifdef RENDER_FOR_PICK
    gl_FragColor = v_pickColor;
#else
    gl_FragColor = color;
#endif
}