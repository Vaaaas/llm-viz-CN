import React from 'react';
import { Phase } from "./Walkthrough";
import { commentary, embed, IWalkthroughArgs, setInitialCamera } from "./WalkthroughTools";
import s from './Walkthrough.module.scss';
import { Vec3 } from '@/src/utils/vector';

let minGptLink = 'https://github.com/karpathy/minGPT';
let pytorchLink = 'https://pytorch.org/';
let andrejLink = 'https://karpathy.ai/';
let zeroToHeroLink = 'https://karpathy.ai/zero-to-hero.html';

export function walkthrough01_Prelim(args: IWalkthroughArgs) {
    let { state, walkthrough: wt } = args;

    if (wt.phase !== Phase.Intro_Prelim) {
        return;
    }

    setInitialCamera(state, new Vec3(184.744, 0.000, -636.820), new Vec3(296.000, 16.000, 13.500));

    let c0 = commentary(wt, null, 0)`
在我们深入研究算法的复杂性之前，让我们先稍微回顾一下。

这个指南侧重于"推理(inference)"，而不是训练，因此只是整个机器学习过程的一小部分。
在我们的案例中，模型的权重已经过预训练，我们使用推理过程来生成输出。这直接在您的浏览器中运行。

这里展示的模型属于GPT（生成预训练Transformer）家族，可以被描述为“基于上下文的token预测器”。
OpenAI在2018年推出了这个家族，其中著名的成员包括GPT-2、GPT-3和GPT-3.5 Turbo，后者是广泛使用的ChatGPT的基础。
它也可能与GPT-4有关，但具体细节尚不清楚。

这个指南的灵感来自于${embedLink('minGPT', minGptLink)} GitHub项目，这是一个由${embedLink('Andrej Karpathy', andrejLink)}创建的在${embedLink('PyTorch', pytorchLink)}中的最小GPT实现。
他的YouTube系列${embedLink("Neural Networks: Zero to Hero", zeroToHeroLink)}和minGPT项目在创建这个指南时提供了宝贵的资源。这里特色的玩具模型基于minGPT项目中的一个模型。

好的，让我们开始吧！

Before we delve into the algorithm's intricacies, let's take a brief step back.

This guide focuses on _inference_, not training, and as such is only a small part of the entire machine-learning process.
In our case, the model's weights have been pre-trained, and we use the inference process to generate output. This runs directly in your browser.

The model showcased here is part of the GPT (generative pre-trained transformer) family, which can be described as a "context-based token predictor".
OpenAI introduced this family in 2018, with notable members such as GPT-2, GPT-3, and GPT-3.5 Turbo, the latter being the foundation of the widely-used ChatGPT.
It might also be related to GPT-4, but specific details remain unknown.

This guide was inspired by the ${embedLink('minGPT', minGptLink)} GitHub project, a minimal GPT implementation in ${embedLink('PyTorch', pytorchLink)}
created by ${embedLink('Andrej Karpathy', andrejLink)}.
His YouTube series ${embedLink("Neural Networks: Zero to Hero", zeroToHeroLink)} and the minGPT project have been invaluable resources in the creation of this
guide. The toy model featured here is based on one found within the minGPT project.

Alright, let's get started!
`;

}

export function embedLink(a: React.ReactNode, href: string) {
    return embedInline(<a className={s.externalLink} href={href} target="_blank" rel="noopener noreferrer">{a}</a>);
}

export function embedInline(a: React.ReactNode) {
    return { insertInline: a };
}


// Another similar model is BERT (bidirectional encoder representations from transformers), a "context-aware text encoder" commonly
// used for tasks like document classification and search.  Newer models like Facebook's LLaMA (large language model architecture), continue to use
// a similar transformer architecture, albeit with some minor differences.
