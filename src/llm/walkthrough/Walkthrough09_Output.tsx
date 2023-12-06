import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, IWalkthroughArgs, setInitialCamera } from "./WalkthroughTools";

export function walkthrough09_Output(args: IWalkthroughArgs) {
    let { walkthrough: wt, state } = args;

    if (wt.phase !== Phase.Input_Detail_Output) {
        return;
    }

    setInitialCamera(state, new Vec3(-20.203, 0.000, -1642.819), new Vec3(281.600, -7.900, 2.298));

    let c0 = commentary(wt, null, 0)`

最后，我们来到了模型的结束部分。最后一个Transformer块的输出经过层归一化，然后做线性变换（矩阵乘法），这次没有偏置。

这最后的变换将我们每一列的向量从长度 _C_ 变换到长度 _nvocab_ 。因此，它实际上是为我们的每一列的词汇表中的每个词生成一个分数。这些分数有一个特殊的名称：logits。

"logits"这个名字来源于"log-odds"，即每个token的几率的对数。之所以使用"log"，是因为接下来我们应用的softmax会进行指数化，将其转换为“几率”或概率。

为了将这些分数转换成好的概率，我们通过softmax操作进行处理。现在，对于每一列，我们有一个由模型分配给词汇表中每个词的概率。

在这个特定模型中，它实际上已经学会了如何对三个字母进行排序的所有答案，所以概率严重倾向于正确的答案。

当我们通过时间推进模型时，我们使用最后一列的概率来确定添加到序列中的下一个token。例如，如果我们已经向模型提供了六个token，我们将使用第6列的输出概率。

这一列的输出是一系列概率，我们实际上必须选择其中一个作为序列中的下一个。我们通过“从分布中采样”来做到这一点。也就是说，我们随机选择一个token，按其概率加权。
例如，概率为0.9的token将被选中90%的时间。

然而，在这里还有其他选择，例如总是选择概率最高的token。

我们还可以通过使用温度参数来控制分布的“平滑性”。较高的温度将使分布更均匀，较低的温度将使其更集中在概率最高的token上。

我们通过在应用softmax之前用温度除以logits（线性变换的输出）来实现这一点。由于softmax中的指数化对较大的数字有很大影响，使它们更接近会减少这种效果。

Finally, we come to the end of the model. The output of the final transformer block is passed through
a layer normalization, and then we use a linear transformation (matrix multiplication), this time without a bias.

This final transformation takes each of our column vectors from length C to length nvocab. Hence,
it's effectively producing a score for each word in the vocabulary for each of our columns. These
scores have a special name: logits.

The name "logits" comes from "log-odds," i.e., the logarithm of the odds of each token. "Log" is
used because the softmax we apply next does an exponentiation to convert to "odds" or probabilities.

To convert these scores into nice probabilities, we pass them through a softmax operation. Now, for
each column, we have a probability the model assigns to each word in the vocabulary.

In this particular model, it has effectively learned all the answers to the question of how to sort
three letters, so the probabilities are heavily weighted toward the correct answer.

When we're stepping the model through time, we use the last column's probabilities to determine the
next token to add to the sequence. For example, if we've supplied six tokens into the model, we'll
use the output probabilities of the 6th column.

This column's output is a series of probabilities, and we actually have to pick one of them to use
as the next in the sequence. We do this by "sampling from the distribution." That is, we randomly
choose a token, weighted by its probability. For example, a token with a probability of 0.9 will be
chosen 90% of the time.

There are other options here, however, such as always choosing the token with the highest probability.

We can also control the "smoothness" of the distribution by using a temperature parameter. A higher
temperature will make the distribution more uniform, and a lower temperature will make it more
concentrated on the highest probability tokens.

We do this by dividing the logits (the output of the linear transformation) by the temperature before
applying the softmax. Since the exponentiation in the softmax has a large effect on larger numbers,
making them all closer together will reduce this effect.
`;

}
