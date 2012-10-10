/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/Matrix4',
         'Core/PrimitiveType',
         'Renderer/BufferUsage'
     ], 'Renderer/AutomaticUniforms', function(
         createContext,
         destroyContext,
         Matrix4,
         PrimitiveType,
         BufferUsage) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    function verifyDraw(fs, modelMatrix) {
        var vs = 'attribute vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }';
        var sp = context.createShaderProgram(vs, fs);

        var va = context.createVertexArray();
        va.addAttribute({
            index : sp.getVertexAttributes().position.index,
            vertexBuffer : context.createVertexBuffer(new Float32Array([0, 0, 0, 1]), BufferUsage.STATIC_DRAW),
            componentsPerAttribute : 4
        });

        context.clear();
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            modelMatrix : modelMatrix
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);

        sp = sp.destroy();
        va = va.destroy();
    }

    it('can declare automatic uniforms', function() {
        var fs =
            'uniform vec4 czm_viewport; ' +
            'void main() { ' +
            '  gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_viewport', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4((czm_viewport.x == 0.0) && (czm_viewport.y == 0.0) && (czm_viewport.z == 1.0) && (czm_viewport.w == 1.0)); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_viewportOrthographic', function() {
        var fs =
            'void main() { ' +
            '  bool b0 = (czm_viewportOrthographic[0][0] != 0.0) && (czm_viewportOrthographic[1][0] == 0.0) && (czm_viewportOrthographic[2][0] == 0.0) && (czm_viewportOrthographic[3][0] != 0.0); ' +
            '  bool b1 = (czm_viewportOrthographic[0][1] == 0.0) && (czm_viewportOrthographic[1][1] != 0.0) && (czm_viewportOrthographic[2][1] == 0.0) && (czm_viewportOrthographic[3][1] != 0.0); ' +
            '  bool b2 = (czm_viewportOrthographic[0][2] == 0.0) && (czm_viewportOrthographic[1][2] == 0.0) && (czm_viewportOrthographic[2][2] != 0.0) && (czm_viewportOrthographic[3][2] != 0.0); ' +
            '  bool b3 = (czm_viewportOrthographic[0][3] == 0.0) && (czm_viewportOrthographic[1][3] == 0.0) && (czm_viewportOrthographic[2][3] == 0.0) && (czm_viewportOrthographic[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_viewportTransformation', function() {
        var fs =
            'void main() { ' +
            '  bool b0 = (czm_viewportTransformation[0][0] != 0.0) && (czm_viewportTransformation[1][0] == 0.0) && (czm_viewportTransformation[2][0] == 0.0) && (czm_viewportTransformation[3][0] != 0.0); ' +
            '  bool b1 = (czm_viewportTransformation[0][1] == 0.0) && (czm_viewportTransformation[1][1] != 0.0) && (czm_viewportTransformation[2][1] == 0.0) && (czm_viewportTransformation[3][1] != 0.0); ' +
            '  bool b2 = (czm_viewportTransformation[0][2] == 0.0) && (czm_viewportTransformation[1][2] == 0.0) && (czm_viewportTransformation[2][2] != 0.0) && (czm_viewportTransformation[3][2] != 0.0); ' +
            '  bool b3 = (czm_viewportTransformation[0][3] == 0.0) && (czm_viewportTransformation[1][3] == 0.0) && (czm_viewportTransformation[2][3] == 0.0) && (czm_viewportTransformation[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_model', function() {
        var fs =
            'void main() { ' +
            '  bool b0 = (czm_model[0][0] ==  1.0) && (czm_model[1][0] ==  2.0) && (czm_model[2][0] ==  3.0) && (czm_model[3][0] ==  4.0); ' +
            '  bool b1 = (czm_model[0][1] ==  5.0) && (czm_model[1][1] ==  6.0) && (czm_model[2][1] ==  7.0) && (czm_model[3][1] ==  8.0); ' +
            '  bool b2 = (czm_model[0][2] ==  9.0) && (czm_model[1][2] == 10.0) && (czm_model[2][2] == 11.0) && (czm_model[3][2] == 12.0); ' +
            '  bool b3 = (czm_model[0][3] == 13.0) && (czm_model[1][3] == 14.0) && (czm_model[2][3] == 15.0) && (czm_model[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs, new Matrix4( 1.0,  2.0,  3.0,  4.0,
            5.0,  6.0,  7.0,  8.0,
            9.0, 10.0, 11.0, 12.0,
           13.0, 14.0, 15.0, 16.0));
    });

    it('has czm_view', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                5.0,  6.0,  7.0,  8.0,
                                9.0, 10.0, 11.0, 12.0,
                               13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_view[0][0] ==  1.0) && (czm_view[1][0] ==  2.0) && (czm_view[2][0] ==  3.0) && (czm_view[3][0] ==  4.0); ' +
            '  bool b1 = (czm_view[0][1] ==  5.0) && (czm_view[1][1] ==  6.0) && (czm_view[2][1] ==  7.0) && (czm_view[3][1] ==  8.0); ' +
            '  bool b2 = (czm_view[0][2] ==  9.0) && (czm_view[1][2] == 10.0) && (czm_view[2][2] == 11.0) && (czm_view[3][2] == 12.0); ' +
            '  bool b3 = (czm_view[0][3] == 13.0) && (czm_view[1][3] == 14.0) && (czm_view[2][3] == 15.0) && (czm_view[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_viewRotation', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                5.0,  6.0,  7.0,  8.0,
                                9.0, 10.0, 11.0, 12.0,
                               13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_viewRotation[0][0] ==  1.0) && (czm_viewRotation[1][0] ==  2.0) && (czm_viewRotation[2][0] ==  3.0); ' +
            '  bool b1 = (czm_viewRotation[0][1] ==  5.0) && (czm_viewRotation[1][1] ==  6.0) && (czm_viewRotation[2][1] ==  7.0); ' +
            '  bool b2 = (czm_viewRotation[0][2] ==  9.0) && (czm_viewRotation[1][2] == 10.0) && (czm_viewRotation[2][2] == 11.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_inverseView', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 7.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 9.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (czm_inverseView[0][0] == 1.0) && (czm_inverseView[1][0] == 0.0) && (czm_inverseView[2][0] == 0.0) && (czm_inverseView[3][0] == -7.0) &&' +
            '    (czm_inverseView[0][1] == 0.0) && (czm_inverseView[1][1] == 1.0) && (czm_inverseView[2][1] == 0.0) && (czm_inverseView[3][1] == -8.0) &&' +
            '    (czm_inverseView[0][2] == 0.0) && (czm_inverseView[1][2] == 0.0) && (czm_inverseView[2][2] == 1.0) && (czm_inverseView[3][2] == -9.0)' +
            '  ); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_inverseViewRotation', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 7.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 9.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (czm_inverseViewRotation[0][0] == 1.0) && (czm_inverseViewRotation[1][0] == 0.0) && (czm_inverseViewRotation[2][0] == 0.0) && ' +
            '    (czm_inverseViewRotation[0][1] == 0.0) && (czm_inverseViewRotation[1][1] == 1.0) && (czm_inverseViewRotation[2][1] == 0.0) && ' +
            '    (czm_inverseViewRotation[0][2] == 0.0) && (czm_inverseViewRotation[1][2] == 0.0) && (czm_inverseViewRotation[2][2] == 1.0) ' +
            '  ); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_projection', function() {
        var us = context.getUniformState();
        us.setProjection(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                      5.0,  6.0,  7.0,  8.0,
                                      9.0, 10.0, 11.0, 12.0,
                                     13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_projection[0][0] ==  1.0) && (czm_projection[1][0] ==  2.0) && (czm_projection[2][0] ==  3.0) && (czm_projection[3][0] ==  4.0); ' +
            '  bool b1 = (czm_projection[0][1] ==  5.0) && (czm_projection[1][1] ==  6.0) && (czm_projection[2][1] ==  7.0) && (czm_projection[3][1] ==  8.0); ' +
            '  bool b2 = (czm_projection[0][2] ==  9.0) && (czm_projection[1][2] == 10.0) && (czm_projection[2][2] == 11.0) && (czm_projection[3][2] == 12.0); ' +
            '  bool b3 = (czm_projection[0][3] == 13.0) && (czm_projection[1][3] == 14.0) && (czm_projection[2][3] == 15.0) && (czm_projection[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_inverseProjection', function() {
        var us = context.getUniformState();
        us.setProjection(new Matrix4(1.0, 0.0, 0.0, 1.0,
                                     0.0, 1.0, 0.0, 2.0,
                                     0.0, 0.0, 1.0, 3.0,
                                     0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_inverseProjection[0][0] == 1.0) && (czm_inverseProjection[1][0] == 0.0) && (czm_inverseProjection[2][0] == 0.0) && (czm_inverseProjection[3][0] == -1.0); ' +
            '  bool b1 = (czm_inverseProjection[0][1] == 0.0) && (czm_inverseProjection[1][1] == 1.0) && (czm_inverseProjection[2][1] == 0.0) && (czm_inverseProjection[3][1] == -2.0); ' +
            '  bool b2 = (czm_inverseProjection[0][2] == 0.0) && (czm_inverseProjection[1][2] == 0.0) && (czm_inverseProjection[2][2] == 1.0) && (czm_inverseProjection[3][2] == -3.0); ' +
            '  bool b3 = (czm_inverseProjection[0][3] == 0.0) && (czm_inverseProjection[1][3] == 0.0) && (czm_inverseProjection[2][3] == 0.0) && (czm_inverseProjection[3][3] ==  1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_infiniteProjection', function() {
        var us = context.getUniformState();
        us.setInfiniteProjection(new Matrix4( 1.0,  2.0,  3.0,  4.0,
                                              5.0,  6.0,  7.0,  8.0,
                                              9.0, 10.0, 11.0, 12.0,
                                             13.0, 14.0, 15.0, 16.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_infiniteProjection[0][0] ==  1.0) && (czm_infiniteProjection[1][0] ==  2.0) && (czm_infiniteProjection[2][0] ==  3.0) && (czm_infiniteProjection[3][0] ==  4.0); ' +
            '  bool b1 = (czm_infiniteProjection[0][1] ==  5.0) && (czm_infiniteProjection[1][1] ==  6.0) && (czm_infiniteProjection[2][1] ==  7.0) && (czm_infiniteProjection[3][1] ==  8.0); ' +
            '  bool b2 = (czm_infiniteProjection[0][2] ==  9.0) && (czm_infiniteProjection[1][2] == 10.0) && (czm_infiniteProjection[2][2] == 11.0) && (czm_infiniteProjection[3][2] == 12.0); ' +
            '  bool b3 = (czm_infiniteProjection[0][3] == 13.0) && (czm_infiniteProjection[1][3] == 14.0) && (czm_infiniteProjection[2][3] == 15.0) && (czm_infiniteProjection[3][3] == 16.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs);
    });

    it('has czm_modelView', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 1.0,
                               0.0, 1.0, 0.0, 1.0,
                               0.0, 0.0, 1.0, 1.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_modelView[0][0] == 2.0) && (czm_modelView[1][0] == 0.0) && (czm_modelView[2][0] == 0.0) && (czm_modelView[3][0] == 1.0); ' +
            '  bool b1 = (czm_modelView[0][1] == 0.0) && (czm_modelView[1][1] == 2.0) && (czm_modelView[2][1] == 0.0) && (czm_modelView[3][1] == 1.0); ' +
            '  bool b2 = (czm_modelView[0][2] == 0.0) && (czm_modelView[1][2] == 0.0) && (czm_modelView[2][2] == 2.0) && (czm_modelView[3][2] == 1.0); ' +
            '  bool b3 = (czm_modelView[0][3] == 0.0) && (czm_modelView[1][3] == 0.0) && (czm_modelView[2][3] == 0.0) && (czm_modelView[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs, new Matrix4(
            2.0, 0.0, 0.0, 0.0,
            0.0, 2.0, 0.0, 0.0,
            0.0, 0.0, 2.0, 0.0,
            0.0, 0.0, 0.0, 1.0));
    });

    it('has czm_inverseModelView', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 0.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_inverseModelView[0][0] == 1.0) && (czm_inverseModelView[1][0] == 0.0) && (czm_inverseModelView[2][0] == 0.0) && (czm_inverseModelView[3][0] == -1.0); ' +
            '  bool b1 = (czm_inverseModelView[0][1] == 0.0) && (czm_inverseModelView[1][1] == 1.0) && (czm_inverseModelView[2][1] == 0.0) && (czm_inverseModelView[3][1] == -2.0); ' +
            '  bool b2 = (czm_inverseModelView[0][2] == 0.0) && (czm_inverseModelView[1][2] == 0.0) && (czm_inverseModelView[2][2] == 1.0) && (czm_inverseModelView[3][2] == -3.0); ' +
            '  bool b3 = (czm_inverseModelView[0][3] == 0.0) && (czm_inverseModelView[1][3] == 0.0) && (czm_inverseModelView[2][3] == 0.0) && (czm_inverseModelView[3][3] ==  1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';
        verifyDraw(fs, new Matrix4(
                1.0, 0.0, 0.0, 1.0,
                0.0, 1.0, 0.0, 2.0,
                0.0, 0.0, 1.0, 3.0,
                0.0, 0.0, 0.0, 1.0));
    });

    it('has czm_viewProjection', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));
        us.setProjection(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                     0.0, 1.0, 0.0, 0.0,
                                     0.0, 0.0, 1.0, 9.0,
                                     0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_viewProjection[0][0] == 1.0) && (czm_viewProjection[1][0] == 0.0) && (czm_viewProjection[2][0] == 0.0) && (czm_viewProjection[3][0] == 0.0); ' +
            '  bool b1 = (czm_viewProjection[0][1] == 0.0) && (czm_viewProjection[1][1] == 1.0) && (czm_viewProjection[2][1] == 0.0) && (czm_viewProjection[3][1] == 8.0); ' +
            '  bool b2 = (czm_viewProjection[0][2] == 0.0) && (czm_viewProjection[1][2] == 0.0) && (czm_viewProjection[2][2] == 1.0) && (czm_viewProjection[3][2] == 9.0); ' +
            '  bool b3 = (czm_viewProjection[0][3] == 0.0) && (czm_viewProjection[1][3] == 0.0) && (czm_viewProjection[2][3] == 0.0) && (czm_viewProjection[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';

        verifyDraw(fs);
    });

    it('has czm_modelViewProjection', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));
        us.setProjection(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                     0.0, 1.0, 0.0, 0.0,
                                     0.0, 0.0, 1.0, 9.0,
                                     0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_modelViewProjection[0][0] == 1.0) && (czm_modelViewProjection[1][0] == 0.0) && (czm_modelViewProjection[2][0] == 0.0) && (czm_modelViewProjection[3][0] == 7.0); ' +
            '  bool b1 = (czm_modelViewProjection[0][1] == 0.0) && (czm_modelViewProjection[1][1] == 1.0) && (czm_modelViewProjection[2][1] == 0.0) && (czm_modelViewProjection[3][1] == 8.0); ' +
            '  bool b2 = (czm_modelViewProjection[0][2] == 0.0) && (czm_modelViewProjection[1][2] == 0.0) && (czm_modelViewProjection[2][2] == 1.0) && (czm_modelViewProjection[3][2] == 9.0); ' +
            '  bool b3 = (czm_modelViewProjection[0][3] == 0.0) && (czm_modelViewProjection[1][3] == 0.0) && (czm_modelViewProjection[2][3] == 0.0) && (czm_modelViewProjection[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';

        verifyDraw(fs, new Matrix4(
                1.0, 0.0, 0.0, 7.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0));
    });

    it('has czm_modelViewInfiniteProjection', function() {
        var us = context.getUniformState();
        us.setView(new Matrix4(1.0, 0.0, 0.0, 0.0,
                               0.0, 1.0, 0.0, 8.0,
                               0.0, 0.0, 1.0, 0.0,
                               0.0, 0.0, 0.0, 1.0));
        us.setInfiniteProjection(new Matrix4(1.0, 0.0, 0.0, 0.0,
                                             0.0, 1.0, 0.0, 0.0,
                                             0.0, 0.0, 1.0, 9.0,
                                             0.0, 0.0, 0.0, 1.0));

        var fs =
            'void main() { ' +
            '  bool b0 = (czm_modelViewInfiniteProjection[0][0] == 1.0) && (czm_modelViewInfiniteProjection[1][0] == 0.0) && (czm_modelViewInfiniteProjection[2][0] == 0.0) && (czm_modelViewInfiniteProjection[3][0] == 7.0); ' +
            '  bool b1 = (czm_modelViewInfiniteProjection[0][1] == 0.0) && (czm_modelViewInfiniteProjection[1][1] == 1.0) && (czm_modelViewInfiniteProjection[2][1] == 0.0) && (czm_modelViewInfiniteProjection[3][1] == 8.0); ' +
            '  bool b2 = (czm_modelViewInfiniteProjection[0][2] == 0.0) && (czm_modelViewInfiniteProjection[1][2] == 0.0) && (czm_modelViewInfiniteProjection[2][2] == 1.0) && (czm_modelViewInfiniteProjection[3][2] == 9.0); ' +
            '  bool b3 = (czm_modelViewInfiniteProjection[0][3] == 0.0) && (czm_modelViewInfiniteProjection[1][3] == 0.0) && (czm_modelViewInfiniteProjection[2][3] == 0.0) && (czm_modelViewInfiniteProjection[3][3] == 1.0); ' +
            '  gl_FragColor = vec4(b0 && b1 && b2 && b3); ' +
            '}';

        verifyDraw(fs, new Matrix4(
                1.0, 0.0, 0.0, 7.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0));
    });

    it('has czm_normal', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (czm_normal[0][0] == 1.0) && (czm_normal[1][0] == 0.0) && (czm_normal[2][0] == 0.0) && ' +
            '    (czm_normal[0][1] == 0.0) && (czm_normal[1][1] == 1.0) && (czm_normal[2][1] == 0.0) && ' +
            '    (czm_normal[0][2] == 0.0) && (czm_normal[1][2] == 0.0) && (czm_normal[2][2] == 1.0) ' +
            '  ); ' +
            '}';
        verifyDraw(fs, new Matrix4(
                1.0, 0.0, 0.0, 7.0,
                0.0, 1.0, 0.0, 8.0,
                0.0, 0.0, 1.0, 9.0,
                0.0, 0.0, 0.0, 1.0));
    });

    it('has czm_inverseNormal', function() {
        var fs =
            'void main() { ' +
            '  gl_FragColor = vec4(' +
            '    (czm_inverseNormal[0][0] == 1.0) && (czm_inverseNormal[1][0] == 0.0) && (czm_inverseNormal[2][0] == 0.0) && ' +
            '    (czm_inverseNormal[0][1] == 0.0) && (czm_inverseNormal[1][1] == 1.0) && (czm_inverseNormal[2][1] == 0.0) && ' +
            '    (czm_inverseNormal[0][2] == 0.0) && (czm_inverseNormal[1][2] == 0.0) && (czm_inverseNormal[2][2] == 1.0) ' +
            '  ); ' +
            '}';
        verifyDraw(fs, new Matrix4(
                1.0, 0.0, 0.0, 7.0,
                0.0, 1.0, 0.0, 8.0,
                0.0, 0.0, 1.0, 9.0,
                0.0, 0.0, 0.0, 1.0));
    });

    it('has czm_sunDirectionEC', function() {
        var fs = 'void main() { gl_FragColor = vec4(czm_sunDirectionEC != vec3(0.0)); }';
        verifyDraw(fs);
    });

    it('has czm_sunDirectionWC', function() {
        var fs = 'void main() { gl_FragColor = vec4(czm_sunDirectionWC != vec3(0.0)); }';
        verifyDraw(fs);
    });

    it('has czm_viewerPositionWC', function() {
        var us = context.getUniformState();
        us.setView(Matrix4.IDENTITY);

        var fs = 'void main() { gl_FragColor = vec4(czm_viewerPositionWC == vec3(0.0)); }';
        verifyDraw(fs);
    });
});