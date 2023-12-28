import { duplicateGrid, splitGrid } from "../Annotations";
import { getBlockValueAtIdx } from "../components/DataFlow";
import { IBlkDef } from "../GptModelLayout";
import { drawText, IFontOpts, measureText } from "../render/fontRender";
import { lerp } from "@/src/utils/math";
import { Mat4f } from "@/src/utils/matrix";
import { Dim, Vec3, Vec4 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, DimStyle, IWalkthroughArgs, moveCameraTo, setInitialCamera } from "./WalkthroughTools";
import { processUpTo, startProcessBefore } from "./Walkthrough00_Intro";

export function walkthrough02_Embedding(args: IWalkthroughArgs) {
    let { walkthrough: wt, state, tools: { c_str, c_blockRef, c_dimRef, afterTime, cleanup, breakAfter }, layout } = args;
    let render = state.render;

    if (wt.phase !== Phase.Input_Detail_Embedding) {
        return;
    }

    setInitialCamera(state, new Vec3(15.654, 0.000, -80.905), new Vec3(287.000, 14.500, 3.199));
    wt.dimHighlightBlocks = [layout.idxObj, layout.tokEmbedObj, layout.posEmbedObj, layout.residual0];

    commentary(wt)`
我们之前看到了如何使用一个简单的查找表将token映射到一系列整数。这些整数，即${c_blockRef('token索引', state.layout.idxObj, DimStyle.TokenIdx)}，是我们在模型中第一次看到也是唯一一次出现整数。我们从这里开始使用浮点数（小数）。

让我们看看如何使用第4个token（索引3）来生成我们的${c_blockRef('输入嵌入', state.layout.residual0)}的第4列向量。

We saw previously how the tokens are mapped to a sequence of integers using a simple lookup table.
These integers, the ${c_blockRef('_token indices_', state.layout.idxObj, DimStyle.TokenIdx)}, are the first and only time we see integers in the model.
From here on out, we're using floats (decimal numbers).

Let's take a look at how the 4th token (index 3) is used to generate the 4th column vector of our ${c_blockRef('_input embedding_', state.layout.residual0)}.`;
    breakAfter();

    let t_moveCamera = afterTime(null, 1.0);
    let t0_splitEmbedAnim = afterTime(null, 0.3);

    breakAfter();

    commentary(wt)`
我们使用token索引（在这种情况下是${c_str('B', DimStyle.Token)} = ${c_dimRef('1', DimStyle.TokenIdx)}）来选择左侧${c_blockRef('token嵌入矩阵', state.layout.tokEmbedObj)}的第2列。注意我们这里使用的是基于0的索引，所以第一列的索引是0。

这产生了一个大小为${c_dimRef('C = 48', DimStyle.C)}的列向量，我们称之为token嵌入。

We use the token index (in this case ${c_str('B', DimStyle.Token)} = ${c_dimRef('1', DimStyle.TokenIdx)}) to select the 2nd column of the ${c_blockRef('_token embedding matrix_', state.layout.tokEmbedObj)} on the left.
Note we're using 0-based indexing here, so the first column is at index 0.

This produces a column vector of size ${c_dimRef('_C_ = 48', DimStyle.C)}, which we describe as the token embedding.
    `;
    breakAfter();

    let t1_fadeEmbedAnim = afterTime(null, 0.3);
    let t2_highlightTokenEmbed = afterTime(null, 0.8);

    breakAfter();

    commentary(wt)`
由于我们正在查看第4个位置（t = ${c_dimRef('3', DimStyle.T)}）中的token ${c_str('B', DimStyle.Token)}，我们将取${c_blockRef('位置嵌入矩阵', state.layout.posEmbedObj)}的第4列。

这也产生了一个大小为${c_dimRef('C = 48', DimStyle.C)}的列向量，我们称之为位置嵌入。

And since we're looking at our token ${c_str('B', DimStyle.Token)} in the 4th _position_ (t = ${c_dimRef('3', DimStyle.T)}), we'll take the 4th column of the ${c_blockRef('_position embedding matrix_', state.layout.posEmbedObj)}.

This also produces a column vector of size ${c_dimRef('_C_ = 48', DimStyle.C)}, which we describe as the position embedding.
    `;
    breakAfter();

    let t4_highlightPosEmbed = afterTime(null, 0.8);

    breakAfter();

    commentary(wt)`
注意，这些位置和token嵌入都是在训练过程中学习得到的（由蓝色表示）。

现在我们得到了这两个列向量，我们只需将它们相加，以产生另一个大小为${c_dimRef('C = 48', DimStyle.C)}的列向量。

Note that both of these position and token embeddings are learned during training (indicated by their blue color).

Now that we have these two column vectors, we simply add them together to produce another column vector of size ${c_dimRef('_C_ = 48', DimStyle.C)}.
`;

    breakAfter();

    let t3_moveTokenEmbed = afterTime(null, 0.8);
    let t5_movePosEmbed = afterTime(null, 0.8);
    let t6_plusSymAnim = afterTime(null, 0.8);
    let t7_addAnim = afterTime(null, 0.8);
    let t8_placeAnim = afterTime(null, 0.8);
    let t9_cleanupInstant = afterTime(null, 0.0);
    let t10_fadeAnim = afterTime(null, 0.8);

    breakAfter();

    commentary(wt)`
我们现在对输入序列中的所有token运行相同的过程，创建一组既包含token值又包含它们位置的向量。

We now run this same process for all of the tokens in the input sequence, creating a set of vectors which incorporate both the token values and their positions.

`;

    breakAfter();

    let t11_fillRest = afterTime(null, 5.0);

    breakAfter();

    commentary(wt)`
随时可以将鼠标悬停在${c_blockRef('输入嵌入', state.layout.residual0)}矩阵的每个单元格上，以便查看相应的计算过程及其数据来源。

我们看到，对输入序列中的所有token运行这个过程会产生一个大小为${c_dimRef('T', DimStyle.T)} x ${c_dimRef('C', DimStyle.C)}的矩阵。
这里的${c_dimRef('T', DimStyle.T)}代表${c_dimRef('时间', DimStyle.T)}，即，你可以将序列中后面的令牌视为时间上的后面。
${c_dimRef('C', DimStyle.C)}代表${c_dimRef('通道', DimStyle.C)}，但也被称为“特征”、“维度”或“嵌入大小”。这个长度${c_dimRef('C', DimStyle.C)}是模型的几个“超参数”之一，由设计者选择，以在模型大小和性能之间进行权衡。

这个矩阵，我们将其称为${c_blockRef('输入嵌入', state.layout.residual0)}，现在已经准备好通过模型传递。
这个包含${c_dimRef('T', DimStyle.T)}列，每列长度为${c_dimRef('C', DimStyle.C)}的集合将会在整个指南中频繁看到。

Feel free to hover over individual cells on the ${c_blockRef('_input embedding_', state.layout.residual0)} matrix to see the computations and their sources.

We see that running this process for all the tokens in the input sequence produces a matrix of size ${c_dimRef('_T_', DimStyle.T)} x ${c_dimRef('_C_', DimStyle.C)}.
The ${c_dimRef('_T_', DimStyle.T)} stands for ${c_dimRef('_time_', DimStyle.T)}, i.e., you can think of tokens later in the sequence as later in time.
The ${c_dimRef('_C_', DimStyle.C)} stands for ${c_dimRef('_channel_', DimStyle.C)}, but is also referred to as "feature" or "dimension" or "embedding size". This length, ${c_dimRef('_C_', DimStyle.C)},
is one of the several "hyperparameters" of the model, and is chosen by the designer to in a tradeoff between model size and performance.

This matrix, which we'll refer to as the ${c_blockRef('_input embedding_', state.layout.residual0)} is now ready to be passed down through the model.
This collection of ${c_dimRef('T', DimStyle.T)} columns each of length ${c_dimRef('C', DimStyle.C)} will become a familiar sight throughout this guide.
`;

    cleanup(t9_cleanupInstant, [t3_moveTokenEmbed, t5_movePosEmbed, t6_plusSymAnim, t7_addAnim, t8_placeAnim]);
    cleanup(t10_fadeAnim, [t0_splitEmbedAnim, t1_fadeEmbedAnim, t2_highlightTokenEmbed, t4_highlightPosEmbed]);

    moveCameraTo(state, t_moveCamera, new Vec3(7.6, 0, -33.1), new Vec3(290, 15.5, 0.8));

    let residCol: IBlkDef = null!;
    let exampleIdx = 3;
    if ((t0_splitEmbedAnim.t > 0.0 || t10_fadeAnim.t > 0.0) && t11_fillRest.t === 0) {
        splitGrid(layout, layout.idxObj, Dim.X, exampleIdx + 0.5, t0_splitEmbedAnim.t * 4.0);

        layout.residual0.access!.disable = true;
        layout.residual0.opacity = lerp(1.0, 0.1, t1_fadeEmbedAnim.t);

        residCol = splitGrid(layout, layout.residual0, Dim.X, exampleIdx + 0.5, t0_splitEmbedAnim.t * 4.0)!;
        residCol.highlight = 0.3;

        residCol.opacity = lerp(1.0, 0.0, t1_fadeEmbedAnim.t);

    }

    let tokValue = getBlockValueAtIdx(layout.idxObj, new Vec3(exampleIdx, 0, 0)) ?? 1;


    let tokColDupe: IBlkDef | null = null;
    let posColDupe: IBlkDef | null = null;

    if (t2_highlightTokenEmbed.t > 0.0) {
        let tokEmbedCol = splitGrid(layout, layout.tokEmbedObj, Dim.X, tokValue + 0.5, t2_highlightTokenEmbed.t * 4.0)!;

        tokColDupe = duplicateGrid(layout, tokEmbedCol);
        tokColDupe.t = 'i';
        tokEmbedCol.highlight = 0.3;

        let startPos = new Vec3(tokEmbedCol.x, tokEmbedCol.y, tokEmbedCol.z);
        let targetPos = new Vec3(residCol.x, residCol.y, residCol.z).add(new Vec3(-2.0, 0, 3.0));

        let pos = startPos.lerp(targetPos, t3_moveTokenEmbed.t);

        tokColDupe.x = pos.x;
        tokColDupe.y = pos.y;
        tokColDupe.z = pos.z;
    }


    if (t4_highlightPosEmbed.t > 0.0) {
        let posEmbedCol = splitGrid(layout, layout.posEmbedObj, Dim.X, exampleIdx + 0.5, t4_highlightPosEmbed.t * 4.0)!;

        posColDupe = duplicateGrid(layout, posEmbedCol);
        posColDupe.t = 'i';
        posEmbedCol.highlight = 0.3;

        let startPos = new Vec3(posEmbedCol.x, posEmbedCol.y, posEmbedCol.z);
        let targetPos = new Vec3(residCol.x, residCol.y, residCol.z).add(new Vec3(2.0, 0, 3.0));

        let pos = startPos.lerp(targetPos, t5_movePosEmbed.t);

        posColDupe.x = pos.x;
        posColDupe.y = pos.y;
        posColDupe.z = pos.z;
    }

    if (t6_plusSymAnim.t > 0.0 && tokColDupe && posColDupe && t7_addAnim.t < 1.0) {
        for (let c = 0; c < layout.shape.C; c++) {
            let plusCenter = new Vec3(
                (tokColDupe.x + tokColDupe.dx + posColDupe.x) / 2,
                tokColDupe.y + layout.cell * (c + 0.5),
                tokColDupe.z + tokColDupe.dz / 2);

            let isActive = t6_plusSymAnim.t > (c + 1) / layout.shape.C;
            let opacity = lerp(0.0, 1.0, isActive ? 1 : 0);

            let fontOpts: IFontOpts = { color: new Vec4(0, 0, 0, 1).mul(opacity), size: 1.5, mtx: Mat4f.fromTranslation(plusCenter) };
            let w = measureText(render.modelFontBuf, '+', fontOpts);

            drawText(render.modelFontBuf, '+', -w/2, -fontOpts.size/2, fontOpts);
        }
    }

    let origResidPos = residCol ? new Vec3(residCol.x, residCol.y, residCol.z) : new Vec3();
    let offsetResidPos = origResidPos.add(new Vec3(0.0, 0, 3.0));

    if (t7_addAnim.t > 0.0 && tokColDupe && posColDupe) {
        let targetPos = offsetResidPos;
        let tokStartPos = new Vec3(tokColDupe.x, tokColDupe.y, tokColDupe.z);
        let posStartPos = new Vec3(posColDupe.x, posColDupe.y, posColDupe.z);

        let tokPos = tokStartPos.lerp(targetPos, t7_addAnim.t);
        let posPos = posStartPos.lerp(targetPos, t7_addAnim.t);

        tokColDupe.x = tokPos.x;
        tokColDupe.y = tokPos.y;
        tokColDupe.z = tokPos.z;
        posColDupe.x = posPos.x;
        posColDupe.y = posPos.y;
        posColDupe.z = posPos.z;

        if (t7_addAnim.t > 0.95) {
            tokColDupe.opacity = 0.0;
            posColDupe.opacity = 0.0;
            residCol.opacity = 1.0;
            residCol.highlight = 0.0;
            residCol.access!.disable = false;
            residCol.x = targetPos.x;
            residCol.y = targetPos.y;
            residCol.z = targetPos.z;
        }
    }

    if (t8_placeAnim.t > 0.0) {
        let startPos = offsetResidPos;
        let targetPos = origResidPos;
        let pos = startPos.lerp(targetPos, t8_placeAnim.t);
        residCol.x = pos.x;
        residCol.y = pos.y;
        residCol.z = pos.z;
    }

    if (t9_cleanupInstant.t > 0.0 && residCol) {
        residCol.opacity = 1.0;
        residCol.highlight = 0.0;
        residCol.access!.disable = false;
    }

    if (t11_fillRest.t > 0.0) {
        layout.residual0.access!.disable = true;

        let prevInfo = startProcessBefore(state, layout.residual0);
        processUpTo(state, t11_fillRest, layout.residual0, prevInfo);
    }
    // new Vec3(-6.9, 0, -36.5), new Vec3(281.5, 5.5, 0.8)
}
