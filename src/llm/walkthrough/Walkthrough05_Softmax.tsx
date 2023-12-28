import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, IWalkthroughArgs, setInitialCamera } from "./WalkthroughTools";

export function walkthrough05_Softmax(args: IWalkthroughArgs) {
    let { walkthrough: wt, state } = args;

    if (wt.phase !== Phase.Input_Detail_Softmax) {
        return;
    }

    setInitialCamera(state, new Vec3(-24.350, 0.000, -1702.195), new Vec3(283.100, 0.600, 1.556));

    let c0 = commentary(wt, null, 0)`

Softmax操作是自注意力的一部分，如前一节所见，它也会出现在模型的最末端。

其目标是取一个向量并规范化其值，使它们加起来等于1.0。然而，这不仅仅是简单地除以总和。相反，每个输入值首先被指数化。

a = exp(x_1)

这样做的效果是使所有值变为正值。一旦我们有了一个由指数化值组成的向量，我们就可以将每个值除以所有值的总和。这将确保值的总和为1.0。
由于所有的指数化值都是正的，我们知道结果值将介于0.0和1.0之间，这为原始值提供了概率分布。

这就是softmax的全部内容：简单地指数化值，然后除以总和。

然而，有一个小复杂性。如果输入值中的任何一个值很大，那么指数化的值将会非常大。我们最终将除以一个很大的数，这可能会导致浮点运算中的问题。

Softmax操作的一个有用属性是，如果我们向所有输入值添加一个常数，结果将是相同的。所以我们可以找到输入向量中的最大值并从所有值中减去它。
这确保了最大值是0.0，并且softmax保持数值稳定。

让我们看看在自注意力层中的softmax操作。每个softmax操作的输入向量是自注意力矩阵的一行（但只到对角线）。

像层规范化一样，我们有一个中间步骤，其中我们存储一些聚合值以保持过程的高效性。

对于每一行，我们存储行中的最大值和移位后的指数化值的总和。然后，为了生成相应的输出行，我们可以执行一小组操作：减去最大值，指数化，然后除以总和。

“softmax”名字是怎么来的？这个操作的“硬”版本，称为argmax，只是找到最大值，将其设为1.0，并为所有其他值分配0.0。相比之下，
softmax操作是这个操作的“更柔和”版本。由于softmax中涉及的指数化，最大值被强调并推向1.0，同时仍然保持了对所有输入值的概率分布。
这允许更细致的表示，不仅捕捉最可能的选项，而且还捕捉其他选项的相对可能性。

The softmax operation is used as part of self-attention, as seen in the previous section, and it
will also appear at the very end of the model.

Its goal is to take a vector and normalize its values so that they sum to 1.0. However, it's not as
simple as dividing by the sum. Instead, each input value is first exponentiated.

  a = exp(x_1)

This has the effect of making all values positive. Once we have a vector of our exponentiated
values, we can then divide each value by the sum of all the values. This will ensure that the sum
of the values is 1.0. Since all the exponentiated values are positive, we know that the resulting
values will be between 0.0 and 1.0, which provides a probability distribution over the original values.

That's it for softmax: simply exponentiate the values and then divide by the sum.

However, there's a slight complication. If any of the input values are quite large, then the
exponentiated values will be very large. We'll end up dividing a large number by a very large number,
and this can cause issues with floating-point arithmetic.

One useful property of the softmax operation is that if we add a constant to all the input values,
the result will be the same. So we can find the largest value in the input vector and subtract it
from all the values. This ensures that the largest value is 0.0, and the softmax remains numerically
stable.

Let's take a look at the softmax operation in the context of the self-attention layer. Our input
vector for each softmax operation is a row of the self-attention matrix (but only up to the diagonal).

Like with layer normalization, we have an intermediate step where we store some aggregation values
to keep the process efficient.

For each row, we store the max value in the row and the sum of the shifted & exponentiated values.
Then, to produce the corresponding output row, we can perform a small set of operations: subtract the
max, exponentiate, and divide by the sum.

What's with the name "softmax"? The "hard" version of this operation, called argmax, simply finds
the maximum value, sets it to 1.0, and assigns 0.0 to all other values. In contrast, the softmax
operation serves as a "softer" version of that. Due to the exponentiation involved in softmax, the
largest value is emphasized and pushed towards 1.0, while still maintaining a probability distribution
over all input values. This allows for a more nuanced representation that captures not only the most
likely option but also the relative likelihood of other options.
`;

}
