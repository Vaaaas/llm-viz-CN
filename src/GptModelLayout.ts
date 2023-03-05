import { IGpuGptBlockLayer, IGpuGptModel, IGpuLayerNormLayer, IModelShape } from "./GptModel";
import { isNil } from "./utils/data";
import { Mat4f } from "./utils/matrix";
import { IBufferTex } from "./utils/renderPhases";

export interface IBlkDef {
    t: 'w' | 'i', // weights; intermediate value
    x: number;
    y: number;
    z: number;
    dx: number; // units: model-space
    dy: number;
    dz: number;
    cx: number; // units: number of cells
    cy: number;
    cz: number;
    access?: IBlkAccess;
    localMtx?: Mat4f; // for creating blocks that are sub-parts of a block
    // what to do for different axes?
    rangeOffsetsX?: [number, number][]; // if this block has been split, map from [[s0, xOff], [s1, xOff], ...] to the original block
    rangeOffsetsY?: [number, number][];
    rangeOffsetsZ?: [number, number][];
    highlight?: number; // 0 - 1 (0 = no highlight, 1 = full highlight)
    subs?: IBlkDef[]; // substitutes for this block (i.e. render these instead)
}

export interface IBlkAccess {
    src: IBufferTex;
    channel: 'r' | 'g' | 'b';
    scale: number;
    mat: Mat4f; // actually using the first two columns for a 3x2 matrix: mapping (x, y, z) integer cell coord to (x, y) src tex coord
    disable?: boolean;
}

interface IBlkAccessDefArgs {
    src?: IBufferTex;
    channel?: 'r' | 'g' | 'b';
    scale?: number;
    x: number[];
    y: number[];
}

interface IBlkDefArgs {
    t: 'w' | 'i', // weights; intermediate value
    xL?: number; // pos of Left edge
    xR?: number; // Right
    xM?: number; // Middle
    zF?: number; // Front
    zB?: number; // Back
    zM?: number; // Middle
    y: number;
    cx: number; // units: number of cells
    cz: number;
    cy: number;
    access?: IBlkAccessDefArgs;
}

export function cellPositionX(layout: IGptModelLayout, blk: IBlkDef, index: number) {
    let base = blk.x + layout.cell * index;
    if (!blk.rangeOffsetsX) {
        return base;
    }
    for (let [s, xOff] of blk.rangeOffsetsX) {
        if (index < s) {
            return base + xOff;
        }
    }
    return base;
}

export type IGptModelLayout = ReturnType<typeof genGptModelLayout>;

export function genGptModelLayout(shape: IModelShape, gptGpuModel: IGpuGptModel | null = null) {
    let { B, T, C, vocabSize, nHeads, A, nBlocks } = shape;

    // work our way downwards from the top
    // x is to the left and right
    // y is coming out of the page
    // z is going up, and the stack advances down from the top (at (0, 0, 0))

    // a single batch of the residual pathway goes down the x-z plane
    // weights & off-residual pathways are left & right of the residual pathway (i.e. along x)
    // those blocks might have y-depth but that's OK: still have space to add batches
    // x = 0 is just to the left of time-cell t=0

    let y = 0;

    let cell = 1.5;
    let margin = Math.max(4, C / 8);

    function mk(args: IBlkDefArgs): IBlkDef {
        let xDef = [args.xL, args.xR, args.xM].map(a => +!isNil(a)).reduce((a, b) => a + b, 0);
        let yDef = [args.zF, args.zB, args.zM].map(a => +!isNil(a)).reduce((a, b) => a + b, 0);
        if (xDef !== 1 || yDef !== 1) {
            throw new Error(`Must supply exactly 1 x arg & 1 y arg: ${JSON.stringify(args)}`);
        }
        let dx = args.cx * cell;
        let dy = args.cz * cell;
        let x = !isNil(args.xL) ? args.xL : !isNil(args.xR) ? args.xR - dx : args.xM! - dx / 2;
        let z = !isNil(args.zB) ? args.zB : !isNil(args.zF) ? args.zF - dy : args.zM! - dy / 2;

        function ensure4(a: number[]) {
            return a.length === 4 ? a : [...a, 0];
        }

        return {
            t: args.t,
            x: x,
            y: args.y,
            z: z,
            dx: args.cx * cell,
            dy: args.cy * cell,
            dz: args.cz * cell,
            cx: args.cx,
            cy: args.cy,
            cz: args.cz,
            access: args.access?.src ? {
                channel: args.access.channel ?? 'r',
                src: args.access.src,
                scale: args.access.scale ?? 10.0,
                mat: Mat4f.fromColMajor([...ensure4(args.access.x), ...ensure4(args.access.y), 0, 0, 0, 0, 0, 0, 0, 0]),
            } : undefined,
        };
    }

    let cubes: IBlkDef[] = [];

    let idxObj = mk({
        t: 'i', cx: T, cz: B, cy: 1, y: y,
        xM: 0, zM: 0,
        access: { src: gptGpuModel?.inputTokens, x: [0, 1, 0], y: [1, 0, T], scale: 1 / vocabSize}
    });

    let leftX = -T * cell / 2 - margin;
    let rightX = T * cell / 2 + margin;

    y += cell + margin;

    let tokEmbedObj = mk({
        t: 'w',
        xR: leftX, zM: 0, y: y,
        cx: vocabSize, cz: 1, cy: C, // src has shape [vocabSize, C]
        access: { src: gptGpuModel?.vocabEmbed.weight, x: [0, 1, 0], y: [1, 0, 0] },
    });

    let posEmbedObj = mk({
        t: 'w',
        xL: rightX, zM: 0, y: y,
        cx: T, cz: 1, cy: C,
        access: { src: gptGpuModel?.posEmbed.weight, x: [0, 1, 0], y: [1, 0, 0] },
    });

    let residual0 = mk({
        t: 'i',
        xM: 0, zM: 0, y: y,
        cx: T, cz: B, cy: C,
        access: { src: gptGpuModel?.add.output, x: [0, 1, 0], y: [1, 0, T] },
    });
    cubes.push(idxObj, tokEmbedObj, posEmbedObj, residual0);

    y += C * cell + margin;

    function createLn(x: number, target?: IGpuLayerNormLayer) {
        let lnLeftX = leftX + x;
        let resLeftX = lnLeftX - T * cell - margin;

        let lnAgg = mk({
            t: 'i', cx: T, cz: B, cy: 2, y: y,
            xR: lnLeftX, zM: 0,
            access: { src: target?.normAgg, x: [0, 1, 0], y: [1, 0, T], scale: 10.0 },
        });

        y += 2 * cell + margin;

        let lnResid = mk({
            t: 'i', cx: T, cz: B, cy: C, y: y,
            xR: lnLeftX, zM: 0,
            access: { src: target?.output, x: [0, 1, 0], y: [1, 0, T], scale: 1.0 },
        });
        let lnSigma = mk({
            t: 'w', cx: 1, cz: 1, cy: C, y: y,
            xR: resLeftX, zM: 0,
            access: { src: target?.normWeight, x: [1, 0, 0], y: [0, 1, 0], scale: 0.5 }, // mostly around 1.0
        });
        let lnMu = mk({
            t: 'w', cx: 1, cz: 1, cy: C, y: y,
            xR: resLeftX - cell * 1 - margin, zM: 0,
            access: { src: target?.normBias, x: [1, 0, 0], y: [0, 1, 0] },
        });
        cubes.push(lnAgg, lnResid, lnSigma, lnMu);
        return { lnAgg, lnResid, lnSigma, lnMu };
    }

    let lnLeftX = leftX - (T + 2) * cell - 3 * margin;
    // @TODO: loop through the blocks

    function createBlock(target?: IGpuGptBlockLayer) {
        let ln1 = createLn(0, target?.ln_1);

        let interHeadMargin = 3 * margin + (C * cell) / 16;
        let qkvMargin = 1 * margin + (C * cell) / 16;

        let headWidth = 3 * B * cell + qkvMargin * 2 + interHeadMargin;

        let attn1Y = y + A * cell + margin;
        let attn2Y = attn1Y; // + T * cell + margin;
        let vOutY = attn2Y + T * cell + margin;

        let attnLeftX = lnLeftX; // leftX - ((T + 2) * cell + 3 * margin);
        let qkvValLeftX = attnLeftX - T * cell - margin;
        let qkvBiasLeftX = qkvValLeftX - C * cell - margin;
        let stepPerHeadY = 0; // A * cell;

        let attnTarget = target?.attn;

        let heads = [];
        for (let i = 0; i < nHeads; i++) {
            let headZMid = headWidth * i - (nHeads - 1) * headWidth / 2;
            let qMid = headZMid - B * cell - qkvMargin;
            let kMid = headZMid;
            let vMid = headZMid + B * cell + qkvMargin;

            let qBlock = mk({
                t: 'i', cx: T, cz: B, cy: A, y: y,
                xR: attnLeftX, zM: qMid,
                access: { src: attnTarget?.qkvOutput, x: [0, 1, 0], y: [1, 0, T * nHeads, 0, T * i], channel: 'r', scale: 1.0 },
            });

            let kBlock = mk({
                t: 'i', cx: T, cz: B, cy: A, y: y,
                xR: attnLeftX, zM: kMid,
                access: { src: attnTarget?.qkvOutput, x: [0, 1, 0], y: [1, 0, T * nHeads, T * i], channel: 'g', scale: 1.0 },
            });

            let vBlock = mk({
                t: 'i', cx: T, cz: B, cy: A, y: y,
                xR: attnLeftX, zM: vMid,
                access: { src: attnTarget?.qkvOutput, x: [0, 1, 0], y: [1, 0, T * nHeads, T * i], channel: 'b', scale: 1.0 },
            });

            let qWeightBlock = mk({
                t: 'w', cx: C, cz: 1, cy: A, y: y,
                xR: qkvValLeftX, zM: qMid,
                access: { src: attnTarget?.qkvWeight, x: [1, 0, 0], y: [0, 1, 0, A * i], channel: 'r' },
            });

            let kWeightBlock = mk({
                t: 'w', cx: C, cz: 1, cy: A, y: y,
                xR: qkvValLeftX, zM: kMid,
                access: { src: attnTarget?.qkvWeight, x: [1, 0, 0], y: [0, 1, 0, A * i], channel: 'g' },
            });

            let vWeightBlock = mk({
                t: 'w', cx: C, cz: 1, cy: A, y: y,
                xR: qkvValLeftX, zM: vMid,
                access: { src: attnTarget?.qkvWeight, x: [1, 0, 0], y: [0, 1, 0, A * i], channel: 'b' },
            });

            let qBiasBlock = mk({
                t: 'w', cx: 1, cz: 1, cy: A, y: y,
                xR: qkvBiasLeftX, zM: qMid,
                access: { src: attnTarget?.qkvBias, x: [1, 0, 0], y: [0, 1, 0, A * i], channel: 'r' },
            });

            let kBiasBlock = mk({
                t: 'w', cx: 1, cz: 1, cy: A, y: y,
                xR: qkvBiasLeftX, zM: kMid,
                access: { src: attnTarget?.qkvBias, x: [1, 0, 0], y: [0, 1, 0, A * i], channel: 'g' },
            });

            let vBiasBlock = mk({
                t: 'w', cx: 1, cz: 1, cy: A, y: y,
                xR: qkvBiasLeftX, zM: vMid,
                access: { src: attnTarget?.qkvBias, x: [1, 0, 0], y: [0, 1, 0, A * i], channel: 'b' },
            });

            let attn2LeftX = attnLeftX - (T + 2) * cell - 2 * margin;

            let attnMtx = mk({
                t: 'i', cx: T, cz: B, cy: T, y: attn1Y,
                xR: attnLeftX, zM: headZMid,
                access: { src: attnTarget?.attnMatrix, x: [1, 0, 0], y: [0, 1, nHeads * T, T * i], scale: 1.0 },
            });

            let attnMtxAgg = mk({
                t: 'i', cx: 2, cz: B, cy: T, y: attn1Y,
                xR: attnLeftX - T * cell - margin, zM: headZMid,
                access: { src: attnTarget?.attnMatrixSoftmax, x: [0, 0, 0, 1], y: [0, 1, nHeads * T, T * i], scale: 1.0 },
            });

            let attnMtxSm = mk({
                t: 'i', cx: T, cz: B, cy: T, y: attn1Y,
                xR: attn2LeftX, zM: headZMid,
                access: { src: attnTarget?.attnMatrixSoftmax, x: [1, 0, 0], y: [0, 1, nHeads * T, T * i], scale: 1.0 },
            });

            let vOutBlock = mk({
                t: 'i', cx: T, cz: B, cy: A, y: vOutY + i * stepPerHeadY,
                xR: attnLeftX, zM: headZMid,
                access: { src: attnTarget?.scaledVectors, x: [0, 1, 0, i * A], y: [1, 0, T] },
            });

            let head = {
                qBlock, kBlock, vBlock,
                qWeightBlock, kWeightBlock, vWeightBlock,
                qBiasBlock, kBiasBlock, vBiasBlock,
                attnMtx, attnMtxAgg, attnMtxSm, vOutBlock,
            };
            heads.push(head);
            cubes.push(qBlock, kBlock, vBlock, qWeightBlock, kWeightBlock, vWeightBlock,
                attnMtx, attnMtxAgg, attnMtxSm, vOutBlock, qBiasBlock, kBiasBlock, vBiasBlock);

        }

        // let vOutCombined = mk({
        //     t: 'i', cx: T, cy: B, cz: C, z: vOutZ,
        //     xR: attnLeftX, yF: - headWidth * nHeads / 2,
        // });

        let vFinalZ = Math.min(
            vOutY + stepPerHeadY * (nHeads - 1) + A * cell + margin,
            y + C * cell + margin, // in case the layer norm block is shorter
        );

        let projWeight = mk({
            t: 'w', cx: C, cz: 1, cy: C, y: vFinalZ,
            xR: qkvValLeftX, zM: 0,
            access: { src: attnTarget?.proj.weight, x: [1, 0, 0], y: [0, 1, 0], scale: C * 0.5 },
        });

        let attnOut = mk({
            t: 'i', cx: T, cz: B, cy: C, y: vFinalZ,
            xR: attnLeftX, zM: 0,
            access: { src: attnTarget?.proj.output, x: [0, 1, 0], y: [1, 0, T] },
        });

        let attnResidual = mk({
            t: 'i', cx: T, cz: B, cy: C, y: vFinalZ,
            xM: 0, zM: 0,
            access: { src: attnTarget?.output, x: [0, 1, 0], y: [1, 0, T] },
        });

        cubes.push(projWeight, attnOut, attnResidual);

        y = vFinalZ + C * cell + margin;

        let ln2 = createLn(0, target?.ln_2);

        let mlpFcWeight = mk({
            t: 'w', cx: C * 4, cz: 1, cy: C, y: y,
            xR: attnLeftX, zM: 0,
            access: { src: target?.mlp.fcLayer.weight, x: [0, 1, 0], y: [1, 0, 0], scale: C * 0.5 },
        });

        let mlpFcBias = mk({
            t: 'w', cx: C * 4, cz: 1, cy: 1, y: y - 1 * cell - margin,
            xR: attnLeftX, zM: 0,
            access: { src: target?.mlp.fcLayer.bias!, x: [0, 1, 0], y: [1, 0, 0], scale: C * 0.5 },
        });

        y += C * cell + margin;

        let mlpFc = mk({
            t: 'i', cx: C * 4, cz: B, cy: T, y: y,
            xR: attnLeftX, zM: 0,
            access: { src: target?.mlp.fcLayer.output, x: [1, 0, 0], y: [0, 1, T] },
        });

        y += T * cell + margin;

        let mlpAct = mk({
            t: 'i', cx: C * 4, cz: B, cy: T, y: y,
            xR: attnLeftX, zM: 0,
            access: { src: target?.mlp.mlpGelu, x: [1, 0, 0], y: [0, 1, T] },
        });

        y += T * cell + margin;

        let mlpProjWeight = mk({
            t: 'w', cx: C * 4, cz: 1, cy: C, y: y,
            xR: attnLeftX, zM: 0,
            access: { src: target?.mlp.projLayer.weight, x: [1, 0, 0], y: [0, 1, 0], scale: C * 0.5 },
        });

        let mlpProjBias = mk({
            t: 'w', cx: 1, cz: 1, cy: C, y: y,
            xR: attnLeftX - C * 4 * cell - margin, zM: 0,
            access: { src: target?.mlp.projLayer.bias!, x: [1, 0, 0], y: [0, 1, 0], scale: C * 0.5 },
        });

        let mlpResult = mk({
            t: 'i', cx: T, cz: B, cy: C, y: y,
            xL: attnLeftX + margin, zM: 0,
            access: { src: target?.mlp.projLayer.output, x: [0, 1, 0], y: [1, 0, T] },
        });

        let mlpResidual = mk({
            t: 'i', cx: T, cz: B, cy: C, y: y,
            xM: 0, zM: 0,
            access: { src: target?.mlp.output, x: [0, 1, 0], y: [1, 0, T] },
        });

        y += C * cell - margin;

        cubes.push(mlpFc, mlpFcWeight, mlpFcBias, mlpAct, mlpProjWeight, mlpProjBias, mlpResult, mlpResidual);

        return {
            ln1,
            heads,
            projWeight,
            attnOut,
            attnResidual,
            mlpFc,
            mplFCWeight: mlpFcWeight,
            mlpAct,
            mlpProjWeight,
            mlpResult,
            mlpResidual,
            ln2,
        };
    }

    let blockHalfMargin = 2 * margin;

    y += blockHalfMargin;

    let blocks = [];
    for (let i = 0; i < nBlocks; i++) {
        let target = gptGpuModel?.blocks[i];
        y += blockHalfMargin;
        blocks.push(createBlock(target));
        y += blockHalfMargin;
    }

    y += blockHalfMargin;
    let ln_f = createLn(0, gptGpuModel?.ln_f);


    let lmHeadWeight = mk({
        t: 'w', cx: vocabSize, cz: 1, cy: C, y: y,
        xR: lnLeftX, zM: 0,
        access: { src: gptGpuModel?.lm_head.weight, x: [0, 1, 0], y: [1, 0, 0], scale: 5.0 },
    });

    y += C * cell + margin;

    let logits = mk({
        t: 'i', cx: vocabSize, cz: B, cy: T, y: y,
        xR: lnLeftX, zM: 0,
        access: { src: gptGpuModel?.lm_head.output, x: [1, 0, 0], y: [0, 1, T] },
    });

    // z += vocabSize * cell + margin;

    let logitsAgg = mk({
        t: 'i', cx: 2, cz: B, cy: T, y: y,
        xL: lnLeftX + margin, zM: 0,
        // @TODO: link up
    });

    y += T * cell + margin;

    let logitsSoftmax = mk({
        t: 'i', cx: vocabSize, cz: B, cy: T, y: y,
        xR: lnLeftX, zM: 0,
        // @TODO: link up
    });

    let logitsSoftmaxTopN = mk({
        t: 'i', cx: T, cz: B, cy: Math.min(32, vocabSize), y: y,
        xM: 0, zM: 0,
    });

    cubes.push(lmHeadWeight, logits, logitsAgg, logitsSoftmax, logitsSoftmaxTopN);

    return {
        cubes,
        cell,
        margin,
        idxObj,
        tokEmbedObj,
        posEmbedObj,
        residual0,
        ln_f,
        lmHeadWeight,
        logits,
        logitsAgg,
        logitsSoftmax,
        logitsSoftmaxTopN,
        blocks,
        height: y,
        model: gptGpuModel,
        extraSources: {
            idx: gptGpuModel?.inputBuf,
            tokEmbedOut: gptGpuModel?.vocabEmbed.output,
            posEmbedOut: gptGpuModel?.posEmbed.output,
        },
    };
}
