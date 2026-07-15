# AI PM Lifecycle and Practices

This document synthesizes the core lifecycle frameworks, model development practices, and evaluation strategies outlined in *The AI Product Playbook* and *The AI Product Manager's Handbook*.

## The AI Lifecycle vs. New Product Development (NPD)

While traditional software follows agile/scrum methodologies, AI products require a specialized lifecycle to account for data dependencies, probabilistic outcomes, and continuous model degradation (drift). 

### The 8-Step Data Science Lifecycle (The Playbook)
1. **Problem Definition and Business Understanding:** Define the "why". Identify the user problem, set measurable objectives, and map business goals (e.g., reduce churn by 15%).
2. **Data Collection and Exploration:** Identify data sources (databases, APIs, logs).
3. **Data Preprocessing:** Clean data, handle missing values, and scale numerical features. "Garbage in, garbage out."
4. **Feature Engineering:** Craft the inputs. Create new variables (e.g., "Days Since Last Login") to make data more informative for the model.
5. **Model Selection and Training:** Choose the algorithm based on the problem (Classification vs. Regression). Split data into training and testing sets.
6. **Model Evaluation and Tuning:** Test the model on unseen data. Tune hyperparameters to optimize metrics like Precision and Recall.
7. **Model Deployment and Monitoring:** Integrate the model into the product (e.g., via API). Monitor for **Data Drift** and **Concept Drift**.
8. **Retraining and Maintenance:** Continuously retrain the model with fresh data to prevent performance degradation.

### The 7 Stages of AI NPD (The Handbook)
1. **Discovery:** Ideate and find your "why". Gather qualitative and quantitative feedback.
2. **Define:** Scope the AI MVP. Define performance metrics for the model.
3. **Design:** Create UX mockups and determine how the AI outputs will be presented.
4. **Implementation:** Data scientists, ML engineers, and developers build the MVP.
5. **Marketing:** Craft the message. In AI, balancing excitement with realistic capabilities is critical to avoid overpromising.
6. **Training:** Train users on how to use the AI features and manage expectations regarding error margins.
7. **Launch:** Release and monitor if the product hits the original metrics.

## Model Evaluation: Beyond Simple Accuracy

Because AI is probabilistic, measuring success requires looking at the **Confusion Matrix**:
- **True Positives (TP):** Correctly predicted positive cases.
- **True Negatives (TN):** Correctly predicted negative cases.
- **False Positives (FP):** Incorrectly predicted positive cases (Type I Error / False Alarm).
- **False Negatives (FN):** Incorrectly predicted negative cases (Type II Error / Miss).

### Key Metrics
- **Accuracy:** `(TP + TN) / (TP + TN + FP + FN)`. Can be misleading if data is imbalanced.
- **Precision:** `TP / (TP + FP)`. Prioritize when the cost of a false positive is high (e.g., a spam filter deleting legitimate emails).
- **Recall (Sensitivity):** `TP / (TP + FN)`. Prioritize when the cost of a false negative is high (e.g., missing a fraudulent transaction or a medical diagnosis).
- **F1-Score:** The harmonic mean of Precision and Recall. Use when you need a balanced metric.

## Generative AI and Prompt Engineering

For Large Language Models (LLMs), outputs are variable and subjective. 

### GenAI Evaluations (Evals)
Evals assess the quality, accuracy, safety, and reliability of Generative AI.
- **Criteria:** Relevance, Coherence, Factual Accuracy (avoiding "hallucinations"), Safety (toxicity/bias), and Diversity.
- **Methods:** Human Evaluation (Rating Scales, Comparative Evaluation), Automated Metrics (BLEU/ROUGE for text, Inception Score for images), and Hybrid Approaches.

### Prompt Engineering Best Practices
1. **Be clear and specific:** Vague prompts yield vague outputs.
2. **Provide context:** Give background information and constraints.
3. **Specify format and style:** Define the exact tone and structure (e.g., "bulleted list").
4. **Few-shot learning:** Provide examples of the desired output within the prompt.
5. **Control parameters:** Adjust **Temperature** (for randomness/creativity) and **Top-P / Top-K** (for token sampling diversity).
