import { Vec3 } from "@/src/utils/vector";
import { Phase } from "./Walkthrough";
import { commentary, IWalkthroughArgs, setInitialCamera } from "./WalkthroughTools";

export function walkthrough08_Transformer(args: IWalkthroughArgs) {
    let { walkthrough: wt, state } = args;

    if (wt.phase !== Phase.Input_Detail_Transformer) {
        return;
    }

    setInitialCamera(state, new Vec3(-135.531, 0.000, -353.905), new Vec3(291.100, 13.600, 5.706));

    let c0 = commentary(wt, null, 0)`

这就是一个完整的Transformer块！

这些构成了任何GPT模型的主体，并且会重复多次，每个块的输出都会输入到下一个块中，继续残差路径。

正如在深度学习中常见的，很难确切地说每一层在做什么，但我们有一些大致的想法：较早的层倾向于专注于学习低级特征和模式，而后面的层则学习识别和理解更高级的抽象和关系。
在自然语言处理的背景下，较低的层可能学习语法、句法和简单的词汇关联，而较高的层可能捕捉更复杂的语义关系、话语结构和上下文依赖的含义。

And that's a complete transformer block!

These form the bulk of any GPT model and are repeated a number of times, with the output of one
block feeding into the next, continuing the residual pathway.

As is common in deep learning, it's hard to say exactly what each of these layers is doing, but we
have some general ideas: the earlier layers tend to focus on learning
lower-level features and patterns, while the later layers learn to recognize and understand
higher-level abstractions and relationships. In the context of natural language processing, the
lower layers might learn grammar, syntax, and simple word associations, while the higher layers
might capture more complex semantic relationships, discourse structures, and context-dependent meaning.
`;

}
