Chapter 5
Result and Discussion

5.1 Experimental Results
5.1.1 ResNet 50
The Table 5.1 presents the performance metrics of ResNet 50 in grading cashew apples
based on their ripeness. Three distinct categories are evaluated: Overripe, Ripe, and
Unripe. For Overripe cashew apples, ResNet achieves a precision of 0.43, recall of 0.48,
and an F1-score of 0.45. In the Ripe category, the model demonstrates improved
performance, with precision reaching 0.64, recall at 0.80, and an F1-score of 0.51.
Conversely, in classifying Unripe cashew apples, ResNet shows lower precision and
recall, scoring 0.26 and 0.15, respectively, resulting in an F1-score of 0.19. These metrics
provide valuable insights into the model&#39;s ability to accurately assess the ripeness of
cashew apples, highlighting areas for potential improvement in its classification
capabilities.
Sr. No. Category type Precision Recall F1-score
1 Overripe 0.43 0.48 0.45
2 Ripe 0.64 0.80 0.51
3 Unripe 0.26 0.15 0.19
Table 5.1 Performance measure values of ResNet 50 model.

In Figure 5.1, the actual image of the overripe category of cashew apple is shown, and the
predicted overripe confidence is 99.04%. The cashew apple of the ripe category is the
actual image, and 99.97% is the expected ripe confidence. The cashew apple of the
unripe category is the actual image, and 46.02% is the expected unripe confidence.
The graph in Figure 5.2 illustrates the accuracy of the training and validation phases and
Figure 5.3 illustrates the loss of the train and validation for ResNet50.

58

Actual: Overripe Actual: Ripe Actual: Unripe
Predicted: Overripe Predicted:Ripe Predicted: Unripe
Confidence: 99.04% Confidence: 99.97% Confidence: 46.02%
Figure 5.1 Actual and predicted images using ResNet 50.

Figure 5.2 Training accuracy and validation accuracy graph for created dataset in ResNet

50

Figure 5.3 Training loss and validation loss graph for created dataset in ResNet 50
5.1.2 AlexNet

59

Table 5.2 illustrates the performance evaluation of AlexNet in grading cashew apples
based on their ripeness. The evaluation encompasses three distinct categories: Overripe,
Ripe, and Unripe. For Overripe cashew apples, AlexNet achieves a precision of 0.49,
recall of 0.84, and an F1-score of 0.62. In contrast, in the Ripe category, the model
demonstrates lower precision and recall, scoring 0.30 and 0.22, respectively, resulting in
an F1-score of 0.26. However, AlexNet excels in classifying Unripe cashew apples,
showcasing high precision and moderate recall, with scores of 0.95 and 0.51,
respectively, yielding an F1-score of 0.67. These metrics offer valuable insights into the
strengths and weaknesses of AlexNet in accurately grading the ripeness of cashew apples,
thereby facilitating potential enhancements in its classification performance.
Sr. No. Category type Precision Recall F1-score
1 Overripe 0.49 0.84 0.62
2 Ripe 0.30 0.22 0.26
3 Unripe 0.95 0.51 0.67
Table 5.2 Performance measure values of AlexNet model.

In Figure 5.4, the actual image of the overripe category of cashew apple is shown, and the
predicted overripe confidence is 99.25%. The cashew apple of the ripe category is the
actual image, and 99.95% is the expected ripe confidence. The cashew apple of the
unripe category is the actual image, and 99.88% is the expected unripe confidence.
The graph in Figure 5.5 illustrates the accuracy of the training and validation phases and
Figure 5.6 illustrates the loss of the train and validation for AlexNet.

Actual: Overripe Actual: Ripe Actual: Unripe
Predicted: Overripe Predicted: Ripe Predicted: Unripe
Confidence: 99.25% Confidence: 99.95% Confidence: 99.88%
Figure 5.4 Actual and predicted images using AlexNet.

60

Figure 5.5 Training accuracy and validation accuracy graph for created dataset in

AlexNet.

Figure 5.6 Training loss and validation loss graph for created dataset in AlexNet.
5.1.3 MobileNet V2
The provided table 5.3 illustrates the performance metrics of MobileNet 50 in grading
cashew apples based on their ripeness. The evaluation comprises three distinct categories:
Overripe, Ripe, and Unripe. For Overripe cashew apples, MobileNet achieves a precision
of 0.56, recall of 0.74, and an F1-score of 0.64. Transitioning to the Ripe category, the
model demonstrates a moderate performance, with precision at 0.41 and recall at 0.46,
resulting in an F1-score of 0.43. Conversely, MobileNet excels in classifying Unripe
cashew apples, exhibiting high precision and moderate recall, with scores of 0.79 and
0.42, respectively, yielding an F1-score of 0.55. These metrics offer valuable insights into
MobileNet&#39;s effectiveness in accurately assessing the ripeness of cashew apples across
different categories, suggesting potential areas for further refinement and optimization in
its classification capabilities.

61

Sr. No. Category type Precision Recall F1-score
1 Overripe 0.56 0.74 0.64
2 Ripe 0.41 0.46 0.43
3 Unripe 0.79 0.42 0.55
Table 5.3 Performance measure values of MobileNet V2 model.

In Figure 5.7 , the actual image of the overripe category of cashew apple is shown, and
the predicted overripe confidence is 94.66%. The cashew apple of the ripe category is the
actual image, and 96.21% is the expected ripe confidence. The cashew apple of the
unripe category is the actual image, and 91.77% is the expected unripe confidence.
The graph in Figure 5.8 illustrates the accuracy of the training and validation phases and
Figure 5.9 illustrates the loss of the train and validation for MobileNet V2.

Actual: Overripe Actual: Ripe Actual: Unripe
Predicted: Overripe Predicted: Ripe Predicted: Unripe
Confidence: 89.13% Confidence: 96.21% Confidence: 91.77%
Figure 5.7 Actual and predicted images using MobileNet V2.

62

Figure 5.8 Training accuracy and validation accuracy graph for created dataset in

MobileNetV2.

Figure 5.9 Training loss and validation loss graph for created dataset in MobileNet V2

5.1.4 VGG 19
The provided table 5.4 presents the performance metrics of VGG, a deep convolutional
neural network architecture, in the task of grading cashew apples based on their ripeness.
This evaluation encompasses three distinct categories: Overripe, Ripe, and Unripe. For
Overripe cashew apples, VGG achieves a high precision of 0.81, indicating that when it
predicts an apple as Overripe, it is correct about 81% of the time. Additionally, VGG
shows excellent recall, correctly identifying 95% of the actual Overripe apples. This
results in a robust F1-score of 0.87, which balances precision and recall. Transitioning to
the Ripe category, VGG maintains a consistent performance with a precision and recall
both at 0.79, yielding an F1-score of 0.79. Furthermore, in classifying Unripe cashew
apples, VGG demonstrates impressive precision and recall scores of 0.95 and 0.79,

63

respectively, resulting in an F1-score of 0.86. These metrics underscore the effectiveness
of VGG in accurately assessing the ripeness of cashew apples across various categories,
showcasing its potential utility in agricultural applications.
Sr. No. Category type Precision Recall F1-score
1 Overripe 0.81 0.95 0.87
2 Ripe 0.79 0.79 0.79
3 Unripe 0.95 0.79 0.86
Table 5.4 Performance measure values of VGG19 model.

In Figure 5.10, the actual image of the overripe category of cashew apple is shown, and
the predicted overripe confidence is 100.00%. The cashew apple of the ripe category is
the actual image, and 60.25% is the expected ripe confidence. The cashew apple of the
unripe category is the actual image, and 100.00% is the expected unripe confidence.
The graph in Figure 5.11 illustrates the accuracy of the training and validation phases and
Figure 5.12 illustrates the loss of the train and validation for the VGG19 model.

Actual: Overripe Actual: Ripe Actual: Unripe
Predicted: Overripe Predicted: Ripe Predicted: Unripe
Confidence: 100.00% Confidence: 60.25% Confidence: 100.00%
Figure 5.10 Actual and predicted images using VGG19.

64

Figure 5.11 Training accuracy and validation accuracy graph for created dataset in VGG

19.

Figure 5.12 Training loss and validation loss graph for created dataset in VGG 19.
5.2 Comparative work
The Table 5.5 presents a comparison of the performance of various CNN models in
categorizing fruit maturity based on F1 scores. Each row represents a different maturity
category (Over-Ripe, Ripe, Un-ripe), while each column corresponds to a specific CNN
model (ResNet, AlexNet, MobileNet, VGG 19). In the Overripe category, ResNet
achieved an F1 score of 0.45, AlexNet scored 0.62, MobileNet scored 0.64, and VGG 19
had the highest F1 score of 0.87. Similarly, for the Ripe category, ResNet scored 0.51,
AlexNet scored 0.26, MobileNet scored 0.43, and VGG 19 scored the highest with 0.79.
In the Unripe category, ResNet scored 0.19, AlexNet scored 0.67, MobileNet scored
0.55, and VGG 19 again demonstrated the highest score of 0.86. Thus, VGG19

65

consistently outperformed the other models across all maturity categories, indicating its
superior performance in accurately classifying fruit maturity.

Overripe Ripe Unripe
ResNet 0.45 0.51 0.19
AlexNet 0.62 0.26 0.67
MobileNet 0.64 0.43 0.55
VGG 19 0.87 0.79 0.86
Table 5.5 Comparison of F1 score performance of CNN models used.
5.3 Discussion
The findings of this research project highlight the promising role of deep learning
techniques in revolutionizing the cashew industry&#39;s fruit quality assessment practices. By
employing various deep learning models like AlexNet, ResNet, MobileNet, and VGG19,
alongside different image processing methods, this study successfully categorizes cashew
apple images into three distinct classes: ripe, unripe, and overripe. The utilization of a
substantial dataset sourced from two farms facilitates rigorous training and validation,
with metrics such as F1 score, recall, and precision providing robust evaluations of model
effectiveness.

Among the models investigated, VGG19 emerges as the standout performer, consistently
surpassing others across all three cashew apple ripeness categories. Its impressive
precision, recall, and F1-scores underscore its accuracy in classifying fruit ripeness,
offering a viable solution for automating quality assessment processes within the
industry. This achievement holds significant implications for optimizing market
competitiveness, ensuring product quality control, and enhancing efficiency in cashew
fruit grading operations.

Moreover, the integration of deep learning technology with automation systems and
drone technology presents exciting avenues for future advancements. By equipping

66

drones with image processing capabilities driven by VGG19, farmers can streamline
harvesting operations, minimize labor costs, and mitigate the risk of errors. This
convergence not only enhances productivity but also sets the stage for precision
agriculture practices, fostering sustainability and economic prosperity within the sector.

Looking ahead, continued research and development efforts are essential to unlock the
full potential of deep learning technology in agriculture. Fine-tuning models, expanding
datasets to encompass diverse fruit varieties, and exploring novel applications will further
enhance accuracy and applicability, driving transformative change in fruit quality
assessment practices. By embracing innovation and leveraging emerging technologies,
the agricultural sector can navigate evolving challenges and embrace a future of