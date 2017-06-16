/*global define*/
define([
    './addToArray',
    './ForEach',
    './numberOfComponentsForType',
    './techniqueParameterForSemantic',
    '../../Core/clone',
    '../../Core/defined',
    '../../Core/defaultValue',
    '../../Core/WebGLConstants'
], function(
    addToArray,
    ForEach,
    numberOfComponentsForType,
    techniqueParameterForSemantic,
    clone,
    defined,
    defaultValue,
    WebGLConstants) {
    'use strict';

    function webGLConstantToGlslType(webGLValue) {
        switch (webGLValue) {
            case WebGLConstants.FLOAT:
                return 'float';
            case WebGLConstants.FLOAT_VEC2:
                return 'vec2';
            case WebGLConstants.FLOAT_VEC3:
                return 'vec3';
            case WebGLConstants.FLOAT_VEC4:
                return 'vec4';
            case WebGLConstants.FLOAT_MAT2:
                return 'mat2';
            case WebGLConstants.FLOAT_MAT3:
                return 'mat3';
            case WebGLConstants.FLOAT_MAT4:
                return 'mat4';
            case WebGLConstants.SAMPLER_2D:
                return 'sampler2D';
            case WebGLConstants.BOOL:
                return 'bool';
        }
    }

    function glslTypeToWebGLConstant(glslType) {
        switch (glslType) {
            case 'float':
                return WebGLConstants.FLOAT;
            case 'vec2':
                return WebGLConstants.FLOAT_VEC2;
            case 'vec3':
                return WebGLConstants.FLOAT_VEC3;
            case 'vec4':
                return WebGLConstants.FLOAT_VEC4;
            case 'mat2':
                return WebGLConstants.FLOAT_MAT2;
            case 'mat3':
                return WebGLConstants.FLOAT_MAT3;
            case 'mat4':
                return WebGLConstants.FLOAT_MAT4;
            case 'sampler2D':
                return WebGLConstants.SAMPLER_2D;
        }
    }

    function generateLightParameters(gltf) {
        var result = {};

        var lights;
        if (defined(gltf.extensions) && defined(gltf.extensions.KHR_materials_common)) {
            lights = gltf.extensions.KHR_materials_common.lights;
        }

        if (defined(lights)) {
            // Figure out which node references the light
            var nodes = gltf.nodes;
            for (var nodeName in nodes) {
                if (nodes.hasOwnProperty(nodeName)) {
                    var node = nodes[nodeName];
                    if (defined(node.extensions) && defined(node.extensions.KHR_materials_common)) {
                        var nodeLightId = node.extensions.KHR_materials_common.light;
                        if (defined(nodeLightId) && defined(lights[nodeLightId])) {
                            lights[nodeLightId].node = nodeName;
                        }
                        delete node.extensions.KHR_materials_common;
                    }
                }
            }

            // Add light parameters to result
            var lightCount = 0;
            for (var lightName in lights) {
                if (lights.hasOwnProperty(lightName)) {
                    var light = lights[lightName];
                    var lightType = light.type;
                    if ((lightType !== 'ambient') && !defined(light.node)) {
                        delete lights[lightName];
                        continue;
                    }
                    var lightBaseName = 'light' + lightCount.toString();
                    light.baseName = lightBaseName;
                    switch (lightType) {
                        case 'ambient':
                            var ambient = light.ambient;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: ambient.color
                            };
                            break;
                        case 'directional':
                            var directional = light.directional;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: directional.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                            break;
                        case 'point':
                            var point = light.point;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: point.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                            }
                            result[lightBaseName + 'Attenuation'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: [point.constantAttenuation, point.linearAttenuation, point.quadraticAttenuation]
                            };
                            break;
                        case 'spot':
                            var spot = light.spot;
                            result[lightBaseName + 'Color'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: spot.color
                            };
                            if (defined(light.node)) {
                                result[lightBaseName + 'Transform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEW',
                                    type: WebGLConstants.FLOAT_MAT4
                                };
                                result[lightBaseName + 'InverseTransform'] = {
                                    node: light.node,
                                    semantic: 'MODELVIEWINVERSE',
                                    type: WebGLConstants.FLOAT_MAT4,
                                    useInFragment: true
                                };
                            }
                            result[lightBaseName + 'Attenuation'] = {
                                type: WebGLConstants.FLOAT_VEC3,
                                value: [spot.constantAttenuation, spot.linearAttenuation, spot.quadraticAttenuation]
                            };

                            result[lightBaseName + 'FallOff'] = {
                                type: WebGLConstants.FLOAT_VEC2,
                                value: [spot.fallOffAngle, spot.fallOffExponent]
                            };
                            break;
                    }
                    ++lightCount;
                }
            }
        }

        return result;
    }

    function generateTechnique(gltf, material, lightParameters, frameState, optimizeForCesium) {
        var techniques = gltf.techniques;
        var shaders = gltf.shaders;
        var programs = gltf.programs;

        var parameterValues = material.pbrMetallicRoughness;
        for (var additional in material) {
            if (material.hasOwnProperty(additional) && ((additional.indexOf('Texture') >= 0) || additional.indexOf('Factor') >= 0) || additional === 'doubleSided') {
                parameterValues[additional] = material[additional];
            }
        }

        var vertexShader = 'precision highp float;\n';
        var fragmentShader = 'precision highp float;\n';

        var hasNormals = true;
        var hasTangents = false;
        for (var entry in gltf.meshes) {
            if (defined(entry)) {
                var mesh = gltf.meshes[entry];
                var primitives = mesh.primitives;
                for (var primitive in primitives) {
                    if (defined(primitive)) {
                        var attributes = primitives[primitive].attributes;
                        for (var attribute in attributes) {
                            if (attribute.indexOf('TANGENT') >= 0) {
                                hasTangents = true;
                            }
                        }
                    }
                }
            }
        }

        // Add techniques
        var techniqueParameters = {
            // Add matrices
            modelViewMatrix: {
                semantic: 'MODELVIEW',
                type: WebGLConstants.FLOAT_MAT4
            },
            projectionMatrix: {
                semantic: 'PROJECTION',
                type: WebGLConstants.FLOAT_MAT4
            }
        };

        if (hasNormals) {
            techniqueParameters.normalMatrix = {
                semantic: 'MODELVIEWINVERSETRANSPOSE',
                type: WebGLConstants.FLOAT_MAT3
            };
        }

        // Add material parameters
        var hasTexCoords = false;
        for (var name in parameterValues) {
            //generate shader parameters for KHR_materials_common attributes
            //(including a check, because some boolean flags should not be used as shader parameters)
            if (parameterValues.hasOwnProperty(name)) {
                var valType = getPBRValueType(name, parameterValues[name]);
                if (!hasTexCoords && (valType === WebGLConstants.SAMPLER_2D)) {
                    hasTexCoords = true;
                }
                techniqueParameters[name] = {
                    type: valType
                };
            }
        }

        // Copy light parameters into technique parameters
        if (defined(lightParameters)) {
            for (var lightParamName in lightParameters) {
                if (lightParameters.hasOwnProperty(lightParamName)) {
                    techniqueParameters[lightParamName] = lightParameters[lightParamName];
                }
            }
        }

        // Generate uniforms object before attributes are added
        var techniqueUniforms = {};
        for (var paramName in techniqueParameters) {
            if (techniqueParameters.hasOwnProperty(paramName) && paramName !== 'extras') {
                var param = techniqueParameters[paramName];
                techniqueUniforms['u_' + paramName] = paramName;
                var arraySize = defined(param.count) ? '[' + param.count + ']' : '';
                if (((param.type !== WebGLConstants.FLOAT_MAT3) && (param.type !== WebGLConstants.FLOAT_MAT4)) ||
                    param.useInFragment) {
                    fragmentShader += 'uniform ' + webGLConstantToGlslType(param.type) + ' u_' + paramName + arraySize + ';\n';
                    delete param.useInFragment;
                } else {
                    vertexShader += 'uniform ' + webGLConstantToGlslType(param.type) + ' u_' + paramName + arraySize + ';\n';
                }
            }
        }

        // Add attributes with semantics
        var vertexShaderMain = '';

        // Add position always
        var techniqueAttributes = {
            a_position: 'position'
        };
        techniqueParameters.position = {
            semantic: 'POSITION',
            type: WebGLConstants.FLOAT_VEC3
        };
        vertexShader += 'attribute vec3 a_position;\n';
        vertexShader += 'varying vec3 v_positionEC;\n';
        vertexShaderMain += '  vec4 pos = u_modelViewMatrix * vec4(a_position,1.0);\n';
        vertexShaderMain += '  v_positionEC = pos.xyz;\n';
        vertexShaderMain += '  gl_Position = u_projectionMatrix * pos;\n';
        fragmentShader += 'varying vec3 v_positionEC;\n';

        // Add normal if we don't have constant lighting
        if (hasNormals) {
            techniqueAttributes.a_normal = 'normal';
            techniqueParameters.normal = {
                semantic: 'NORMAL',
                type: WebGLConstants.FLOAT_VEC3
            };
            vertexShader += 'attribute vec3 a_normal;\n';
            vertexShader += 'varying vec3 v_normal;\n';
            vertexShaderMain += '  v_normal = u_normalMatrix * a_normal;\n';

            fragmentShader += 'varying vec3 v_normal;\n';
        }

        if (hasTangents) {
            techniqueAttributes.a_tangent = 'tangent';
            techniqueParameters.tangent = {
                semantic: 'TANGENT',
                type: WebGLConstants.FLOAT_VEC3
            };
            vertexShader += 'attribute vec3 a_tangent;\n';
            vertexShader += 'varying vec3 v_tangent;\n';
            vertexShaderMain += '  v_tangent = (u_modelViewMatrix * vec4(a_tangent, 1.0)).xyz;\n';

            fragmentShader += 'varying vec3 v_tangent;\n';
        }

        // Add texture coordinates if the material uses them
        var v_texcoord;
        if (hasTexCoords) {
            techniqueAttributes.a_texcoord_0 = 'texcoord_0';
            techniqueParameters.texcoord_0 = {
                semantic: 'TEXCOORD_0',
                type: WebGLConstants.FLOAT_VEC2
            };

            v_texcoord = 'v_texcoord_0';
            vertexShader += 'attribute vec2 a_texcoord_0;\n';
            vertexShader += 'varying vec2 ' + v_texcoord + ';\n';
            vertexShaderMain += '  ' + v_texcoord + ' = a_texcoord_0;\n';

            fragmentShader += 'varying vec2 ' + v_texcoord + ';\n';
        }

        // Generate lighting code blocks

        vertexShader += 'void main(void) {\n';
        vertexShader += vertexShaderMain;
        vertexShader += '}\n';

        fragmentShader += 'const float M_PI = 3.141592653589793;\n';

        var lambertianDiffuse = '';
        lambertianDiffuse += 'vec3 lambertianDiffuse(vec3 baseColor) {\n';
        lambertianDiffuse += '  return baseColor / M_PI;\n';
        lambertianDiffuse += '}\n\n';

        var fresnelSchlick2 = '';
        fresnelSchlick2 += 'vec3 fresnelSchlick2(vec3 f0, vec3 f90, float VdotH) {\n';
        fresnelSchlick2 += '  return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);\n';
        fresnelSchlick2 += '}\n\n';

        var fresnelSchlick = '';
        fresnelSchlick += 'vec3 fresnelSchlick(float metalness, float VdotH) {\n';
        fresnelSchlick += '  return metalness + (vec3(1.0) - metalness) * pow(1.0 - VdotH, 5.0);\n';
        fresnelSchlick += '}\n\n';

        var smithVisibilityG1 = '';
        smithVisibilityG1 += 'float smithVisibilityG1(float NdotV, float roughness) {\n';
        smithVisibilityG1 += '  float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;\n';
        smithVisibilityG1 += '  return NdotV / (NdotV * (1.0 - k) + k);\n';
        smithVisibilityG1 += '}\n\n';

        var smithVisibilityGGX = '';
        smithVisibilityGGX += 'float smithVisibilityGGX(float roughness, float NdotL, float NdotV) {\n';
        smithVisibilityGGX += '  return smithVisibilityG1(NdotL, roughness) * smithVisibilityG1(NdotV, roughness);\n';
        smithVisibilityGGX += '}\n\n';

        var GGX = '';
        GGX += 'float GGX(float roughness, float NdotH) {\n';
        GGX += '  float roughnessSquared = roughness * roughness;\n';
        GGX += '  float f = (NdotH * roughnessSquared - NdotH) * NdotH + 1.0;\n';
        GGX += '  return roughnessSquared / (M_PI * f * f);\n';
        GGX += '}\n\n';

        fragmentShader += lambertianDiffuse + fresnelSchlick2 + fresnelSchlick + smithVisibilityG1 + smithVisibilityGGX + GGX;

        var fragmentShaderMain = '';
        fragmentShaderMain += 'void main(void) {\n';
        // Add base color to fragment shader
        if (defined(parameterValues.baseColorTexture)) {
            fragmentShaderMain += '  vec3 baseColor = texture2D(u_baseColorTexture, ' + v_texcoord + ').rgb;\n';
            if (defined(parameterValues.baseColorFactor)) {
                fragmentShaderMain += '  baseColor *= u_baseColorFactor.rgb;\n';
            }
        } else {
            if (defined(parameterValues.baseColorFactor)) {
                fragmentShaderMain += '  vec3 baseColor = u_baseColorFactor;\n';
            } else {
                fragmentShaderMain += '  vec3 baseColor = vec3(1.0);\n';
            }
        }
        // Add metallic-roughness to fragment shader
        if (defined(parameterValues.metallicRoughnessTexture)) {
            fragmentShaderMain += '  vec3 metallicRoughness = texture2D(u_metallicRoughnessTexture, ' + v_texcoord + ').rgb;\n';
            fragmentShaderMain += '  float metalness = clamp(metallicRoughness.b, 0.0, 1.0);\n';
            fragmentShaderMain += '  float roughness = clamp(metallicRoughness.g, 0.04, 1.0);\n';
            if (defined(parameterValues.metallicFactor)) {
                fragmentShaderMain += '  metalness *= u_metallicFactor;\n';
            }
            if (defined(parameterValues.roughnessFactor)) {
                fragmentShaderMain += '  roughness *= u_roughnessFactor;\n';
            }
        } else {
            if (defined(parameterValues.metallicFactor)) {
                fragmentShaderMain += '  float metalness = clamp(u_metallicFactor, 0.0, 1.0);\n';
            } else {
                fragmentShaderMain += '  float metalness = 1.0;\n';
            }
            if (defined(parameterValues.roughnessFactor)) {
                fragmentShaderMain += '  float roughness = clamp(u_roughnessFactor, 0.04, 1.0);\n';
            } else {
                fragmentShaderMain += '  float roughness = 1.0;\n';
            }
        }
        fragmentShaderMain += '  vec3 v = -normalize(v_positionEC);\n';
        fragmentShaderMain += '  vec3 ambientLight = vec3(0.0, 0.0, 0.0);\n';

        // Generate fragment shader's lighting block
        var fragmentLightingBlock = '';
        fragmentLightingBlock += '  vec3 lightColor = vec3(1.0, 1.0, 1.0);\n';
        fragmentLightingBlock += '  vec3 l = normalize(czm_sunDirectionEC);\n';
        fragmentLightingBlock += '  vec3 h = normalize(v + l);\n';
        fragmentLightingBlock += '  vec3 r = normalize(reflect(v, n));\n';
        fragmentLightingBlock += '  float NdotL = clamp(dot(n, l), 0.001, 1.0);\n';
        fragmentLightingBlock += '  float NdotV = abs(dot(n, v)) + 0.001;\n';
        fragmentLightingBlock += '  float NdotH = clamp(dot(n, h), 0.0, 1.0);\n';
        fragmentLightingBlock += '  float LdotH = clamp(dot(l, h), 0.0, 1.0);\n';
        fragmentLightingBlock += '  float VdotH = clamp(dot(v, h), 0.0, 1.0);\n';

        fragmentLightingBlock += '  vec3 f0 = vec3(0.04);\n';
        fragmentLightingBlock += '  vec3 diffuseColor = baseColor * (1.0 - metalness);\n';
        fragmentLightingBlock += '  vec3 specularColor = mix(f0, baseColor, metalness);\n';
        fragmentLightingBlock += '  float reflectance = max(max(specularColor.r, specularColor.g), specularColor.b);\n';
        fragmentLightingBlock += '  vec3 r90 = vec3(clamp(reflectance * 25.0, 0.0, 1.0));\n';
        fragmentLightingBlock += '  vec3 r0 = specularColor.rgb;\n';

        fragmentLightingBlock += '  vec3 F = fresnelSchlick2(r0, r90, VdotH);\n';
        fragmentLightingBlock += '  float G = smithVisibilityGGX(roughness, NdotL, NdotV);\n';
        fragmentLightingBlock += '  float D = GGX(roughness, NdotH);\n';

        fragmentLightingBlock += '  vec3 diffuseContribution = (1.0 - F) * lambertianDiffuse(baseColor);\n';
        fragmentLightingBlock += '  vec3 specularContribution = F * G * D / (4.0 * NdotL * NdotV);\n';
        fragmentLightingBlock += '  vec3 color = NdotL * lightColor * (diffuseContribution + specularContribution);\n';

        fragmentLightingBlock += '  vec3 diffuseIrradiance = vec3(0.5);\n';
        fragmentLightingBlock += '  vec3 specularIrradiance = textureCube(czm_cubeMap, r).rgb;\n';
        fragmentLightingBlock += '  vec2 brdfLUT = texture2D(czm_brdfLUT, vec2(NdotV, 1.0 - roughness)).rg;\n';
        fragmentLightingBlock += '  vec3 IBLColor = (diffuseIrradiance * diffuseColor) + (specularIrradiance * (specularColor * brdfLUT.x + brdfLUT.y));\n';
        fragmentLightingBlock += '  color += IBLColor;\n';

        if (defined(parameterValues.occlusionTexture)) {
            fragmentLightingBlock += '  color *= texture2D(u_occlusionTexture, ' + v_texcoord + ').r;\n';
        }
        if (defined(parameterValues.emissiveTexture)) {
            fragmentLightingBlock += '  vec3 emissive = texture2D(u_emissiveTexture, ' + v_texcoord + ').rgb;\n';
            if (defined(parameterValues.emissiveFactor)) {
                fragmentLightingBlock += '  emissive *= u_emissiveFactor;\n';
            }
            fragmentLightingBlock += '  color += emissive;\n';
        }
        else {
            if (defined(parameterValues.emissiveFactor)) {
                fragmentLightingBlock += '  color += u_emissiveFactor;\n';
            }
        }
        // Add normal mapping to fragment shader
        if (hasNormals) {
            fragmentShaderMain += '  vec3 ng = normalize(v_normal);\n';
            if (defined(parameterValues.normalTexture) && (hasTangents || frameState.context._standardDerivatives)) {
                if (hasTangents) {
                    // Read tangents from varying
                    fragmentShaderMain += '  vec3 t = normalize(v_tangent);\n';
                } else {
                    // Compute tangents
                    fragmentShader = '#extension GL_OES_standard_derivatives : enable\n' + fragmentShader;
                    fragmentShaderMain += '  vec3 pos_dx = dFdx(v_positionEC);\n';
                    fragmentShaderMain += '  vec3 pos_dy = dFdy(v_positionEC);\n';
                    fragmentShaderMain += '  vec3 tex_dx = dFdx(vec3(' + v_texcoord + ',0.0));\n';
                    fragmentShaderMain += '  vec3 tex_dy = dFdy(vec3(' + v_texcoord + ',0.0));\n';
                    fragmentShaderMain += '  vec3 t = (tex_dy.t * pos_dx - tex_dx.t * pos_dy) / (tex_dx.s * tex_dy.t - tex_dy.s * tex_dx.t);\n';
                    fragmentShaderMain += '  t = normalize(t - ng * dot(ng, t));\n';
                }
                fragmentShaderMain += '  vec3 b = normalize(cross(ng, t));\n';
                fragmentShaderMain += '  mat3 tbn = mat3(t, b, ng);\n';
                fragmentShaderMain += '  vec3 n = texture2D(u_normalTexture, ' + v_texcoord + ').rgb;\n';
                fragmentShaderMain += '  n = normalize(tbn * (2.0 * n - 1.0));\n';
            } else {
                fragmentShaderMain += '  vec3 n = ng;\n';
            }
            if (parameterValues.doubleSided) {
                fragmentShaderMain += '  if (!gl_FrontFacing)\n';
                fragmentShaderMain += '  {\n';
                fragmentShaderMain += '    n = -n;\n';
                fragmentShaderMain += '  }\n';
            }
        }

        var finalColorComputation;
        finalColorComputation = '  gl_FragColor = vec4(color, 1.0);\n';

        fragmentShaderMain += fragmentLightingBlock;
        fragmentShaderMain += finalColorComputation;
        fragmentShaderMain += '}\n';

        fragmentShader += fragmentShaderMain;

        var techniqueStates;
        if (parameterValues.doubleSided) {
            techniqueStates = {
                enable: [
                    WebGLConstants.DEPTH_TEST
                ]
            };
        } else {
            techniqueStates = {
                enable: [
                    WebGLConstants.CULL_FACE,
                    WebGLConstants.DEPTH_TEST
                ]
            };
        }

        // Add shaders
        var vertexShaderId = addToArray(shaders, {
            type: WebGLConstants.VERTEX_SHADER,
            extras: {
                _pipeline: {
                    source: vertexShader,
                    extension: '.glsl'
                }
            }
        });

        var fragmentShaderId = addToArray(shaders, {
            type: WebGLConstants.FRAGMENT_SHADER,
            extras: {
                _pipeline: {
                    source: fragmentShader,
                    extension: '.glsl'
                }
            }
        });

        // Add program
        var programAttributes = Object.keys(techniqueAttributes);
        var programId = addToArray(programs, {
            attributes: programAttributes,
            fragmentShader: fragmentShaderId,
            vertexShader: vertexShaderId
        });

        var techniqueId = addToArray(techniques, {
            attributes: techniqueAttributes,
            parameters: techniqueParameters,
            program: programId,
            states: techniqueStates,
            uniforms: techniqueUniforms
        });

        return techniqueId;
    }

    function getPBRValueType(paramName, paramValue) {
        var value;

        // Backwards compatibility for COLLADA2GLTF v1.0-draft when it encoding
        // materials using KHR_materials_common with explicit type/value members
        if (defined(paramValue.value)) {
            value = paramValue.value;
        } else {
            value = paramValue;
        }

        switch (paramName) {
            case 'baseColorFactor':
                return WebGLConstants.FLOAT_VEC4;
            case 'metallicFactor':
                return WebGLConstants.FLOAT;
            case 'roughnessFactor':
                return WebGLConstants.FLOAT;
            case 'baseColorTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'metallicRoughnessTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'normalTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'occlusionTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'emissiveTexture':
                return WebGLConstants.SAMPLER_2D;
            case 'emissiveFactor':
                return WebGLConstants.FLOAT_VEC3;
            case 'doubleSided':
                return WebGLConstants.BOOL;
        }
    }

    function getTechniqueKey(khrMaterialsCommon) {
        var techniqueKey = '';
        techniqueKey += 'technique:' + khrMaterialsCommon.technique + ';';

        var values = khrMaterialsCommon.values;
        var keys = Object.keys(values).sort();
        var keysCount = keys.length;
        for (var i = 0; i < keysCount; ++i) {
            var name = keys[i];
            if (values.hasOwnProperty(name)) {
                techniqueKey += name + ':' + getPBRValueType(name, values[name]);
                techniqueKey += ';';
            }
        }

        var doubleSided = defaultValue(khrMaterialsCommon.doubleSided, false);
        techniqueKey += doubleSided.toString() + ';';
        var transparent = defaultValue(khrMaterialsCommon.transparent, false);
        techniqueKey += transparent.toString() + ';';
        var jointCount = defaultValue(khrMaterialsCommon.jointCount, 0);
        techniqueKey += jointCount.toString() + ';';
        if (jointCount > 0) {
            var skinningInfo = khrMaterialsCommon.extras._pipeline.skinning;
            techniqueKey += skinningInfo.type + ';';
        }

        return techniqueKey;
    }

    function lightDefaults(gltf) {
        if (!defined(gltf.extensions)) {
            gltf.extensions = {};
        }
        var extensions = gltf.extensions;

        if (!defined(extensions.KHR_materials_common)) {
            extensions.KHR_materials_common = {};
        }
        var khrMaterialsCommon = extensions.KHR_materials_common;

        if (!defined(khrMaterialsCommon.lights)) {
            khrMaterialsCommon.lights = {};
        }
        var lights = khrMaterialsCommon.lights;

        var lightsLength = lights.length;
        for (var lightId = 0; lightId < lightsLength; lightId++) {
            var light = lights[lightId];
            if (light.type === 'ambient') {
                if (!defined(light.ambient)) {
                    light.ambient = {};
                }
                var ambientLight = light.ambient;

                if (!defined(ambientLight.color)) {
                    ambientLight.color = [1.0, 1.0, 1.0];
                }
            } else if (light.type === 'directional') {
                if (!defined(light.directional)) {
                    light.directional = {};
                }
                var directionalLight = light.directional;

                if (!defined(directionalLight.color)) {
                    directionalLight.color = [1.0, 1.0, 1.0];
                }
            } else if (light.type === 'point') {
                if (!defined(light.point)) {
                    light.point = {};
                }
                var pointLight = light.point;

                if (!defined(pointLight.color)) {
                    pointLight.color = [1.0, 1.0, 1.0];
                }

                pointLight.constantAttenuation = defaultValue(pointLight.constantAttenuation, 1.0);
                pointLight.linearAttenuation = defaultValue(pointLight.linearAttenuation, 0.0);
                pointLight.quadraticAttenuation = defaultValue(pointLight.quadraticAttenuation, 0.0);
            } else if (light.type === 'spot') {
                if (!defined(light.spot)) {
                    light.spot = {};
                }
                var spotLight = light.spot;

                if (!defined(spotLight.color)) {
                    spotLight.color = [1.0, 1.0, 1.0];
                }

                spotLight.constantAttenuation = defaultValue(spotLight.constantAttenuation, 1.0);
                spotLight.fallOffAngle = defaultValue(spotLight.fallOffAngle, 3.14159265);
                spotLight.fallOffExponent = defaultValue(spotLight.fallOffExponent, 0.0);
                spotLight.linearAttenuation = defaultValue(spotLight.linearAttenuation, 0.0);
                spotLight.quadraticAttenuation = defaultValue(spotLight.quadraticAttenuation, 0.0);
            }
        }
    }

    function getShaderVariable(type) {
        if (type === 'SCALAR') {
            return 'float';
        }
        return type.toLowerCase();
    }

    function ensureSemanticExistenceForPrimitive(gltf, primitive) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        var techniques = gltf.techniques;
        var programs = gltf.programs;
        var shaders = gltf.shaders;

        var attributes = primitive.attributes;
        var material = materials[primitive.material];
        var technique = techniques[material.technique];
        var program = programs[technique.program];
        var vertexShader = shaders[program.vertexShader];

        for (var semantic in attributes) {
            if (attributes.hasOwnProperty(semantic)) {
                if (!defined(techniqueParameterForSemantic(technique, semantic))) {
                    var accessorId = attributes[semantic];
                    var accessor = accessors[accessorId];
                    if (semantic.charAt(0) === '_') {
                        semantic = semantic.slice(1);
                    }
                    var attributeName = 'a_' + semantic;
                    technique.parameters[semantic] = {
                        semantic: semantic,
                        type: accessor.componentType
                    };
                    technique.attributes[attributeName] = semantic;
                    program.attributes.push(attributeName);
                    var pipelineExtras = vertexShader.extras._pipeline;
                    var shaderText = pipelineExtras.source;
                    shaderText = 'attribute ' + getShaderVariable(accessor.type) + ' ' + attributeName + ';\n' + shaderText;
                    pipelineExtras.source = shaderText;
                }
            }
        }
    }

    function ensureSemanticExistence(gltf) {
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                ensureSemanticExistenceForPrimitive(gltf, primitive);
            });
        });
    }

    function splitIncompatibleSkins(gltf) {
        var accessors = gltf.accessors;
        var materials = gltf.materials;
        ForEach.mesh(gltf, function(mesh) {
            ForEach.meshPrimitive(mesh, function(primitive) {
                var materialId = primitive.material;
                var material = materials[materialId];

                if (defined(material.extensions) && defined(material.extensions.KHR_materials_common)) {
                    var khrMaterialsCommon = material.extensions.KHR_materials_common;
                    var jointAccessorId = primitive.attributes.JOINT;
                    var componentType;
                    var type;
                    if (defined(jointAccessorId)) {
                        var jointAccessor = accessors[jointAccessorId];
                        componentType = jointAccessor.componentType;
                        type = jointAccessor.type;
                    }
                    var isSkinned = defined(jointAccessorId);

                    var skinningInfo = khrMaterialsCommon.extras._pipeline.skinning;
                    if (!defined(skinningInfo)) {
                        khrMaterialsCommon.extras._pipeline.skinning = {
                            skinned: isSkinned,
                            componentType: componentType,
                            type: type
                        };
                    } else if ((skinningInfo.skinned !== isSkinned) || (skinningInfo.type !== type)) {
                        // This primitive uses the same material as another one that either isn't skinned or uses a different type to store joints and weights
                        var clonedMaterial = clone(material, true);
                        clonedMaterial.extensions.KHR_materials_common.extras._pipeline.skinning = {
                            skinned: isSkinned,
                            componentType: componentType,
                            type: type
                        };
                        // Split this off as a separate material
                        materialId = addToArray(materials, clonedMaterial);
                        primitive.material = materialId;
                    }
                }
            });
        });
    }

    /**
     * @private
     */
    function processPbrMetallicRoughness(gltf, frameState, options) {
        options = defaultValue(options, {});

        if (!defined(gltf)) {
            return undefined;
        }

        var hasExtension = false;
        ForEach.material(gltf, function(material) {
            if (material.hasOwnProperty('pbrMetallicRoughness')) {
                hasExtension = true;
            }
        });

        if (hasExtension) {
            if (!defined(gltf.programs)) {
                gltf.programs = [];
            }
            if (!defined(gltf.shaders)) {
                gltf.shaders = [];
            }
            if (!defined(gltf.techniques)) {
                gltf.techniques = [];
            }
            lightDefaults(gltf);

            var lightParameters = generateLightParameters(gltf);

            // Pre-processing to assign skinning info and address incompatibilities
            splitIncompatibleSkins(gltf);

            var techniques = {};
            ForEach.material(gltf, function(material) {
                if (material.hasOwnProperty('pbrMetallicRoughness')) {
                    var pbrMetallicRoughness = material.pbrMetallicRoughness;
                    var technique = generateTechnique(gltf, material, lightParameters, frameState, options.optimizeForCesium);
                    // var techniqueKey = 'test';
                    // techniques[techniqueKey] = technique;
                    // Take advantage of the fact that we generate techniques that use the
                    // same parameter names as the extension values.
                    material.values = {};
                    var values = pbrMetallicRoughness;
                    for (var valueName in values) {
                        if (values.hasOwnProperty(valueName)) {
                            var value = values[valueName];
                            material.values[valueName] = value;
                        }
                    }

                    material.technique = technique;
                }
            });

            if (defined(gltf.extensions)) {
                delete gltf.extensions.KHR_materials_common;
                if (Object.keys(gltf.extensions).length === 0) {
                    delete gltf.extensions;
                }
            }

            // If any primitives have semantics that aren't declared in the generated
            // shaders, we want to preserve them.
            ensureSemanticExistence(gltf);
        }

        return gltf;
    }

    return processPbrMetallicRoughness;
});