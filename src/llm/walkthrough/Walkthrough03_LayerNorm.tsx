import React from "react";
import { findSubBlocks, splitGrid } from "../Annotations";
import { drawDataFlow } from "../components/DataFlow";
import { drawDependences } from "../Interaction";
import { clamp } from "@/src/utils/data";
import { lerp } from "@/src/utils/math";
import { Dim, Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { processUpTo, startProcessBefore } from "./Walkthrough00_Intro";
import { commentary, DimStyle, IWalkthroughArgs, moveCameraTo, setInitialCamera } from "./WalkthroughTools";

export function walkthrough03_LayerNorm(args: IWalkthroughArgs) {
    let { walkthrough: wt, layout, state, tools: { afterTime, c_str, c_blockRef, c_dimRef, breakAfter, cleanup } } = args;
    let { C } = layout.shape;

    if (wt.phase !== Phase.Input_Detail_LayerNorm) {
        return;
    }

    let ln = layout.blocks[0].ln1;

    setInitialCamera(state, new Vec3(-6.680, 0.000, -65.256), new Vec3(281.000, 9.000, 2.576));
    wt.dimHighlightBlocks = [layout.residual0, ...ln.cubes];

    commentary(wt, null, 0)`

在前一节中的${c_blockRef('输入嵌入', state.layout.residual0)}矩阵是我们第一个Transformer块的输入。

Transformer块的第一步是对这个矩阵应用"层规范化"(layer normalization)。这是一个单独规范化矩阵中每一列值的操作。

The  ${c_blockRef('_input embedding_', state.layout.residual0)} matrix from the previous section is the input to our first Transformer block.

The first step in the Transformer block is to apply _layer normalization_ to this matrix. This is an
operation that normalizes the values in each column of the matrix separately.
`;
    breakAfter();

    let t_moveCamera = afterTime(null, 1.0);
    let t_hideExtra = afterTime(null, 1.0, 1.0);
    let t_moveInputEmbed = afterTime(null, 1.0);
    let t_moveCameraClose = afterTime(null, 0.5);

    breakAfter();
    commentary(wt)`
在深度神经网络的训练中，规范化是一个重要的步骤，它有助于提高模型在训练过程中的稳定性。

我们可以分别考虑每一列，所以现在让我们专注于第4列（${c_dimRef('t = 3', DimStyle.T)}）。

Normalization is an important step in the training of deep neural networks, and it helps improve the
stability of the model during training.

We can regard each column separately, so let's focus on the 4th column (${c_dimRef('t = 3', DimStyle.T)}) for now.`;

    breakAfter();
    let t_focusColumn = afterTime(null, 0.5);

    // mu ascii: \u03bc
    // sigma ascii: \u03c3
    breakAfter();
    commentary(wt)`
目标是使列中的平均值等于0，标准差等于1。为了做到这一点，
我们找到这一列的${c_blockRef('均值 (\u03bc)', ln.lnAgg1)}和${c_blockRef('标准差 (\u03c3)', ln.lnAgg2)}，然后减去平均值并除以标准差。
    
The goal is to make the average value in the column equal to 0 and the standard deviation equal to 1. To do this,
we find both of these quantities (${c_blockRef('mean (\u03bc)', ln.lnAgg1)} & ${c_blockRef('std dev (\u03c3)', ln.lnAgg2)}) for the column and then subtract the average and divide by the standard deviation.`;

    breakAfter();

    let t_calcMuAgg = afterTime(null, 0.5);
    let t_calcVarAgg = afterTime(null, 0.5);

    // 1e-5 as 1x10^-5, but with superscript: 1x10<sup>-5</sup>

    breakAfter();
    commentary(wt)`
我们在这里使用 E[x] 表示平均值，Var[x] 表示方差（对于长度为${c_dimRef('C', DimStyle.C)}的列）。方差简单来说就是标准差的平方。ε项（ε = ${<>1×10<sup>-5</sup></>}）是为了防止除以零。

我们在聚合层中计算并存储这些值，因为我们要将它们应用于列中的所有值。

最后，一旦我们得到了规范化的值，我们将列中的每个元素乘以一个学习到的${c_blockRef('权重 (\u03b3)', ln.lnSigma)}，然后加一个${c_blockRef('偏置 (β)', ln.lnMu)}值，从而得到我们的${c_blockRef('规范化值', ln.lnResid)}。

The notation we use here is E[x] for the average and Var[x] for the variance (of the column of length ${c_dimRef('C', DimStyle.C)}). The
variance is simply the standard deviation squared. The epsilon term (ε = ${<>1&times;10<sup>-5</sup></>}) is there to prevent division by zero.

We compute and store these values in our aggregation layer since we're applying them to all values in the column.

Finally, once we have the normalized values, we multiply each element in the column by a learned
${c_blockRef('weight (\u03b3)', ln.lnSigma)} and then add a ${c_blockRef('bias (β)', ln.lnMu)} value, resulting in our ${c_blockRef('normalized values', ln.lnResid)}.`;

    breakAfter();

    let t_clean_aggs = afterTime(null, 0.2);
    cleanup(t_clean_aggs, [t_calcMuAgg, t_calcVarAgg]);
    let t_colSequence = afterTime(null, 2.0);

    breakAfter();
    commentary(wt)`
我们对${c_blockRef('输入嵌入矩阵', layout.residual0)}的每一列执行这个规范化操作，结果是${c_blockRef('标准化输入嵌入', ln.lnResid)}，它已经准备好传入自注意力层。

We run this normalization operation on each column of the ${c_blockRef('input embedding matrix', layout.residual0)}, and the result is
the ${c_blockRef('normalized input embedding', ln.lnResid)}, which is ready to be passed into the Self-Attention layer.
`;

    breakAfter();
    let t_cleanupSplits = afterTime(null, 0.5);
    cleanup(t_cleanupSplits, [t_focusColumn]);
    if (t_cleanupSplits.t > 0) {
        t_colSequence.t = 0;
    }
    let t_runAggFull = afterTime(null, 2.0);
    let t_runNormFull = afterTime(null, 6.0);

    moveCameraTo(state, t_moveCamera, new Vec3(21.2, 0, -102.9), new Vec3(281.5, 11, 1.7));

    let exampleIdx = 3;
    let ln1 = layout.blocks[0].ln1;
    let inputBlock = layout.residual0;

    inputBlock.highlight = lerp(0, 0.3, t_hideExtra.t);

    let relevantBlocks = new Set([
        layout.residual0,
        ...ln1.cubes,
    ]);

    for (let blk of layout.cubes) {
            if (!relevantBlocks.has(blk)) {
            blk.opacity = lerp(1.0, 0.0, t_hideExtra.t);
        }
    }

    for (let blk of relevantBlocks) {
        if (blk != layout.residual0 && blk.t !== 'w') {
            blk.access!.disable = true;
        }
    }

    let startResidualY = layout.residual0.y;
    let endResidulY = ln1.lnResid.y;
    layout.residual0.y = lerp(startResidualY, endResidulY, t_moveInputEmbed.t);

    if (t_moveInputEmbed.t >= 0.0) {
        inputBlock.highlight = lerp(0.3, 0.0, t_moveInputEmbed.t);
    }

    moveCameraTo(state, t_moveCameraClose, new Vec3(-14.1, 0, -187.1), new Vec3(270, 4, 0.7));

    let splitAmt = lerp(0.0, 2.0, t_focusColumn.t);
    let splitPos = exampleIdx + 0.5;

    let otherColOpacity = lerp(1.0, 0.3, t_focusColumn.t);
    ln1.lnAgg1.opacity = otherColOpacity;
    ln1.lnAgg2.opacity = otherColOpacity;
    ln1.lnResid.opacity = otherColOpacity;
    inputBlock.opacity = otherColOpacity;

    if (t_focusColumn.t > 0) {
        let aggMuCol = splitGrid(layout, ln1.lnAgg1, Dim.X, splitPos, splitAmt)!;
        let aggVarCol = splitGrid(layout, ln1.lnAgg2, Dim.X, splitPos, splitAmt)!;
        let residCol = splitGrid(layout, ln1.lnResid, Dim.X, splitPos, splitAmt)!;
        let inputCol = splitGrid(layout, inputBlock, Dim.X, splitPos, splitAmt)!;
        aggMuCol.opacity = 1.0;
        aggVarCol.opacity = 1.0;
        residCol.opacity = 1.0;
        inputCol.opacity = 1.0;

        let aggDestIdx = new Vec3(exampleIdx, 0, 0);
        if (t_calcMuAgg.t > 0.0) {
            let pinIdx = new Vec3(0, 10, 0);
            drawDependences(state, ln1.lnAgg1, aggDestIdx);
            drawDataFlow(state, ln1.lnAgg1, aggDestIdx, pinIdx);
            aggMuCol.access!.disable = false;
            inputCol.highlight = 0.3;
        }

        if (t_calcVarAgg.t > 0.0) {
            let pinIdx = new Vec3(9, 9, 0);
            drawDependences(state, ln1.lnAgg2, aggDestIdx);
            drawDataFlow(state, ln1.lnAgg2, aggDestIdx, pinIdx);
            aggVarCol.access!.disable = false;
        }

        if (t_colSequence.t > 0.0) {
            aggMuCol.access!.disable = false;
            aggVarCol.access!.disable = false;

            let pinIdx = new Vec3(-10, 0, 0);

            let cPos = t_colSequence.t * C;
            let cIdx = clamp(Math.floor(cPos), 0, C - 1);
            let destIdx = new Vec3(exampleIdx, cIdx, 0);
            drawDependences(state, ln1.lnResid, destIdx);
            drawDataFlow(state, ln1.lnResid, destIdx, pinIdx);

            let targetCell = splitGrid(layout, residCol, Dim.Y, cIdx + 0.5, 0.0)!;
            targetCell.highlight = 0.3;

            findSubBlocks(residCol, Dim.Y, 0, cIdx).forEach((blk) => {
                blk.access!.disable = false;
            });
        }
    }

    if (t_runAggFull.t > 0.0) {
        try {
            let processInfo = startProcessBefore(state, ln1.lnAgg1);
            processUpTo(state, t_runAggFull, ln1.lnAgg2, processInfo);
            processUpTo(state, t_runNormFull, ln1.lnResid, processInfo);
        } catch (e) {
            console.log(e);
        }
    }
}
