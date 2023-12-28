import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, DimStyle, IWalkthroughArgs, moveCameraTo, setInitialCamera } from "./WalkthroughTools";
import { lerp, lerpSmoothstep } from "@/src/utils/math";
import { processUpTo, startProcessBefore } from "./Walkthrough00_Intro";

export function walkthrough06_Projection(args: IWalkthroughArgs) {
    let { walkthrough: wt, state, layout, tools: { breakAfter, afterTime, c_blockRef, c_dimRef, cleanup } } = args;

    if (wt.phase !== Phase.Input_Detail_Projection) {
        return;
    }

    setInitialCamera(state, new Vec3(-73.167, 0.000, -270.725), new Vec3(293.606, 2.613, 1.366));
    let block = layout.blocks[0];
    wt.dimHighlightBlocks = [...block.heads.map(h => h.vOutBlock), block.projBias, block.projWeight, block.attnOut];

    let outBlocks = block.heads.map(h => h.vOutBlock);

    commentary(wt, null, 0)`
在自注意力过程之后，我们从每个头部获得了输出。这些输出是经过适当混合的V向量，它们受到了Q向量和K向量的影响。

为了组合每个头部的${c_blockRef('输出向量', outBlocks)}，我们简单地将它们堆叠在一起。因此，对于时间${c_dimRef('t = 4', DimStyle.T)}，我们从3个长度为${c_dimRef('A = 16', DimStyle.A)}的向量变成了1个长度为${c_dimRef('C = 48', DimStyle.C)}的向量。

After the self-attention process, we have outputs from each of the heads. These outputs are the
appropriately mixed V vectors, influenced by the Q and K vectors.

To combine the ${c_blockRef('output vectors', outBlocks)} from each head, we simply stack them on top of each other. So, for time
${c_dimRef('t = 4', DimStyle.T)}, we go from 3 vectors of length ${c_dimRef('A = 16', DimStyle.A)} to 1 vector of length ${c_dimRef('C = 48', DimStyle.C)}.
`;

    breakAfter();

    let t_fadeOut = afterTime(null, 1.0, 0.5);
    // let t_zoomToStack = afterTime(null, 1.0);
    let t_stack = afterTime(null, 1.0);

    breakAfter();

    commentary(wt)`
值得注意的是，在GPT中，头内部向量的长度（${c_dimRef('A = 16', DimStyle.A)}）等于${c_dimRef('C', DimStyle.C)}除以头部的数量。这确保了当我们将它们重新堆叠在一起时，我们得到的是原始长度，即${c_dimRef('C', DimStyle.C)}。

从这里开始，我们执行投影以获得该层的输出。这是一个简单的每列基础上的矩阵-向量乘法操作，并添加了偏置。

It's worth noting that in GPT, the length of the vectors within a head (${c_dimRef('A = 16', DimStyle.A)}) is equal to ${c_dimRef('C', DimStyle.C)} / num_heads.
This ensures that when we stack them back together, we get the original length, ${c_dimRef('C', DimStyle.C)}.

From here, we perform the projection to get the output of the layer. This is a simple matrix-vector
multiplication on a per-column basis, with a bias added.`;

    breakAfter();

    let t_process = afterTime(null, 3.0);

    breakAfter();

    commentary(wt)`
现在我们有了自注意力层的输出。我们不是直接将这个输出传递给下一阶段，而是将其与输入嵌入逐元素相加。这个过程，由绿色垂直箭头表示，称为“残差连接(_residual connection_)”或“残差路径(_residual pathway_)”。


Now we have the output of the self-attention layer. Instead of passing this output directly to the
next phase, we add it element-wise to the input embedding. This process, denoted by the green
vertical arrow, is called the _residual connection_ or _residual pathway_.
`;

    breakAfter();

    let t_zoomOut = afterTime(null, 1.0, 0.5);
    let t_processResid = afterTime(null, 3.0);

    cleanup(t_zoomOut, [t_fadeOut, t_stack]);

    breakAfter();

    commentary(wt)`
与层规范化一样，残差连接对于在深度神经网络中实现有效学习非常重要。

现在我们已经有了自注意力的结果，我们可以将其传递到Transformer的下一部分：前馈网络(feed-forward network)。

Like layer normalization, the residual pathway is important for enabling effective learning in deep
neural networks.

Now with the result of self-attention in hand, we can pass it onto the next section of the transformer:
the feed-forward network.
`;

    breakAfter();

    if (t_fadeOut.active) {
        for (let head of block.heads) {
            for (let blk of head.cubes) {
                if (blk !== head.vOutBlock) {
                    blk.opacity = lerpSmoothstep(1, 0, t_fadeOut.t);
                }
            }
        }
    }

    if (t_stack.active) {
        let targetZ = block.attnOut.z;
        for (let headIdx = 0; headIdx < block.heads.length; headIdx++) {
            let head = block.heads[headIdx];
            let targetY = head.vOutBlock.y + head.vOutBlock.dy * (headIdx - block.heads.length + 1);
            head.vOutBlock.y = lerp(head.vOutBlock.y, targetY, t_stack.t);
            head.vOutBlock.z = lerp(head.vOutBlock.z, targetZ, t_stack.t);
        }
    }

    let processInfo = startProcessBefore(state, block.attnOut);

    if (t_process.active) {
        processUpTo(state, t_process, block.attnOut, processInfo);
    }

    moveCameraTo(state, t_zoomOut, new Vec3(-8.304, 0.000, -175.482), new Vec3(293.606, 2.623, 2.618));

    if (t_processResid.active) {
        processUpTo(state, t_processResid, block.attnResidual, processInfo);
    }
}
