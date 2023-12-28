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

最后，我们来到了模型的结束部分。最后一个Transformer块的输出经过层规范化，然后做线性变换（矩阵乘法），这次没有偏置。

这最后一个变换将我们的每个列向量从长度 _C_ 转换成长度 _nvocab_。因此，它实质上是为词汇表中的每个单词在我们的每一列上生成了一个得分。这些得分有一个专有名词：对数几率（logits）。

"logits"这个名字来源于"log-odds"(对数-几率)，即每个token的几率的对数。之所以使用"log"，是因为接下来我们应用的softmax会进行指数化，将其转换为“几率”或概率。

为了将这些分数转换为合适的概率值，我们通过 softmax 操作进行处理。这样，对于每一列，我们就有一个由模型分配给词汇表中每个词的概率。

在这个模型中，它已经有效地学习了如何对三个字母进行排序的全部答案，因此概率大幅偏向于正确答案。

当我们在随时间逐步运行模型时，会利用最后一列的概率来决定下一个要加入序列的token。例如，假设我们已经输入了六个token到模型中，那么我们就会根据第六列的概率输出来确定下一个token。

这一列的输出是一系列概率值，而我们需要从中选择一个作为序列的下一个元素。这一过程称为“从分布中采样”。具体来说，我们会根据其概率大小加权随机选择一个token。
比如，一个概率为0.9的token，在选择时将有90%的概率被选中。

然而，在这里还有其他选择，例如总是选择概率最高的token。

我们还可以通过使用温度参数来控制分布的“平滑性”。较高的温度将使分布更均匀，较低的温度将使其更集中在概率最高的token上。如果你希望得到较为稳健、一贯的回答，可以选择一个较低的值，例如0.2-0.7；如果你期望模型产生更多样化和创造性的内容，可以使用一个较高的值。

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
