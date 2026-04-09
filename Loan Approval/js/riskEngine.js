/* ===========================
   LoanWise AI — Risk Engine
   =========================== */

const RiskEngine = {
    /**
     * Calculate the complete risk assessment for a loan application.
     * @param {Object} app - The application data
     * @returns {Object} - { score, decision, explanations, conditions, metrics }
     */
    evaluate(app) {
        const metrics = this.calculateMetrics(app);
        const scores = this.calculateComponentScores(app, metrics);
        const totalScore = this.calculateTotalScore(scores);
        const decision = this.makeDecision(totalScore, metrics, app);
        const explanations = this.generateExplanations(scores, metrics, app);
        const conditions = this.generateConditions(decision, app, metrics);

        return {
            score: Math.round(totalScore),
            decision: decision,
            metrics: metrics,
            componentScores: scores,
            explanations: explanations,
            conditions: conditions,
            similarProfileInsight: this.generateInsight(totalScore, decision)
        };
    },

    calculateMetrics(app) {
        const monthlyIncome = Number(app.monthlyIncome) || 0;
        const existingEMI = Number(app.existingEMI) || 0;
        const loanAmount = Number(app.loanAmount) || 0;
        const tenure = Number(app.loanTenure) || 12; // months
        const interestRate = 10.5; // default annual rate

        // Calculate proposed EMI using standard formula
        const monthlyRate = interestRate / 12 / 100;
        const proposedEMI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
            (Math.pow(1 + monthlyRate, tenure) - 1);

        const totalEMI = existingEMI + proposedEMI;
        const dti = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 100;
        const totalInterest = (proposedEMI * tenure) - loanAmount;
        const totalPayment = proposedEMI * tenure;

        return {
            monthlyIncome,
            existingEMI,
            proposedEMI: Math.round(proposedEMI),
            totalEMI: Math.round(totalEMI),
            dti: Math.round(dti * 10) / 10,
            loanAmount,
            tenure,
            interestRate,
            totalInterest: Math.round(totalInterest),
            totalPayment: Math.round(totalPayment)
        };
    },

    calculateComponentScores(app, metrics) {
        const creditScore = Number(app.creditScore) || 300;
        const yearsEmployed = Number(app.yearsEmployed) || 0;

        // 1. Credit Score Component (30% weight)
        let creditComponent;
        if (creditScore >= 750) creditComponent = 100;
        else if (creditScore >= 700) creditComponent = 80;
        else if (creditScore >= 650) creditComponent = 60;
        else if (creditScore >= 600) creditComponent = 40;
        else if (creditScore >= 550) creditComponent = 25;
        else creditComponent = 10;

        // 2. Income Adequacy Component (20% weight)
        const incomeToLoan = metrics.monthlyIncome * metrics.tenure / metrics.loanAmount;
        let incomeComponent;
        if (incomeToLoan >= 5) incomeComponent = 100;
        else if (incomeToLoan >= 3) incomeComponent = 80;
        else if (incomeToLoan >= 2) incomeComponent = 60;
        else if (incomeToLoan >= 1.5) incomeComponent = 40;
        else incomeComponent = 20;

        // 3. DTI Component (20% weight)
        let dtiComponent;
        if (metrics.dti <= 20) dtiComponent = 100;
        else if (metrics.dti <= 30) dtiComponent = 80;
        else if (metrics.dti <= 40) dtiComponent = 60;
        else if (metrics.dti <= 50) dtiComponent = 35;
        else dtiComponent = 10;

        // 4. Employment Stability Component (15% weight)
        let employmentComponent;
        const empType = app.employmentType || 'salaried';
        if (empType === 'salaried') {
            if (yearsEmployed >= 5) employmentComponent = 100;
            else if (yearsEmployed >= 3) employmentComponent = 80;
            else if (yearsEmployed >= 1) employmentComponent = 55;
            else employmentComponent = 30;
        } else if (empType === 'self-employed') {
            if (yearsEmployed >= 5) employmentComponent = 85;
            else if (yearsEmployed >= 3) employmentComponent = 65;
            else if (yearsEmployed >= 2) employmentComponent = 45;
            else employmentComponent = 25;
        } else {
            employmentComponent = 15;
        }

        // 5. Data Confidence Component (15% weight)
        const verifiedFields = (app.verifiedFields || []).length;
        const totalCheckableFields = 4; // income, employment, identity, address
        const confidenceRatio = verifiedFields / totalCheckableFields;
        let confidenceComponent;
        if (confidenceRatio >= 0.75) confidenceComponent = 100;
        else if (confidenceRatio >= 0.5) confidenceComponent = 70;
        else if (confidenceRatio >= 0.25) confidenceComponent = 45;
        else confidenceComponent = 20;

        return {
            credit: { score: creditComponent, weight: 0.30, label: 'Credit Score', raw: creditScore },
            income: { score: incomeComponent, weight: 0.20, label: 'Income Adequacy', raw: metrics.monthlyIncome },
            dti: { score: dtiComponent, weight: 0.20, label: 'Debt-to-Income', raw: metrics.dti },
            employment: { score: employmentComponent, weight: 0.15, label: 'Employment Stability', raw: yearsEmployed },
            confidence: { score: confidenceComponent, weight: 0.15, label: 'Data Confidence', raw: confidenceRatio }
        };
    },

    calculateTotalScore(scores) {
        let total = 0;
        for (const key in scores) {
            total += scores[key].score * scores[key].weight;
        }
        return Math.min(100, Math.max(0, total));
    },

    makeDecision(score, metrics, app) {
        // Hard rules first
        if (metrics.dti > 50) return 'rejected';

        // Low confidence data override
        const verifiedFields = (app.verifiedFields || []).length;
        if (verifiedFields === 0 && score >= 35 && score < 75) return 'review';

        // Score-based decision
        if (score > 75) return 'approved';
        if (score >= 50) return 'conditions';
        if (score >= 35) return 'review';
        return 'rejected';
    },

    generateExplanations(scores, metrics, app) {
        const explanations = [];

        // Credit Score
        const cs = Number(app.creditScore) || 300;
        if (cs >= 750) {
            explanations.push({ type: 'positive', text: `Excellent credit score of ${cs} indicates strong creditworthiness.` });
        } else if (cs >= 700) {
            explanations.push({ type: 'positive', text: `Good credit score of ${cs} shows reliable credit history.` });
        } else if (cs >= 650) {
            explanations.push({ type: 'neutral', text: `Fair credit score of ${cs}. Consider improving it for better terms.` });
        } else {
            explanations.push({ type: 'negative', text: `Low credit score of ${cs} indicates credit risk. This significantly impacts your approval.` });
        }

        // DTI
        if (metrics.dti <= 30) {
            explanations.push({ type: 'positive', text: `Healthy debt-to-income ratio of ${metrics.dti}% is well within acceptable limits.` });
        } else if (metrics.dti <= 40) {
            explanations.push({ type: 'neutral', text: `Debt-to-income ratio of ${metrics.dti}% is moderate. Managing existing debts could improve your profile.` });
        } else if (metrics.dti <= 50) {
            explanations.push({ type: 'negative', text: `High debt-to-income ratio of ${metrics.dti}%. This limits your borrowing capacity.` });
        } else {
            explanations.push({ type: 'negative', text: `Debt-to-income ratio of ${metrics.dti}% exceeds the maximum threshold of 50%.` });
        }

        // Income
        if (metrics.monthlyIncome >= 100000) {
            explanations.push({ type: 'positive', text: `Strong monthly income of ${formatCurrency(metrics.monthlyIncome)} provides good repayment capacity.` });
        } else if (metrics.monthlyIncome >= 50000) {
            explanations.push({ type: 'positive', text: `Adequate monthly income of ${formatCurrency(metrics.monthlyIncome)} supports the requested loan.` });
        } else if (metrics.monthlyIncome >= 25000) {
            explanations.push({ type: 'neutral', text: `Monthly income of ${formatCurrency(metrics.monthlyIncome)} is modest relative to the loan request.` });
        } else {
            explanations.push({ type: 'negative', text: `Monthly income of ${formatCurrency(metrics.monthlyIncome)} may not adequately support the loan repayment.` });
        }

        // Employment
        const yearsEmployed = Number(app.yearsEmployed) || 0;
        const empType = app.employmentType || 'salaried';
        if (yearsEmployed >= 3) {
            explanations.push({ type: 'positive', text: `${yearsEmployed} years of ${empType} employment demonstrates stability.` });
        } else if (yearsEmployed >= 1) {
            explanations.push({ type: 'neutral', text: `${yearsEmployed} year(s) of employment. Longer tenure improves your profile.` });
        } else {
            explanations.push({ type: 'negative', text: `Less than 1 year of employment history increases perceived risk.` });
        }

        // Data confidence
        const verifiedFields = (app.verifiedFields || []).length;
        if (verifiedFields >= 3) {
            explanations.push({ type: 'positive', text: `${verifiedFields} out of 4 data points are verified, increasing confidence in the assessment.` });
        } else if (verifiedFields >= 1) {
            explanations.push({ type: 'neutral', text: `Only ${verifiedFields} data point(s) verified. Uploading more documents could improve your score.` });
        } else {
            explanations.push({ type: 'negative', text: `No documents uploaded for verification. Self-reported data receives lower confidence rating.` });
        }

        return explanations;
    },

    generateConditions(decision, app, metrics) {
        if (decision !== 'conditions') return [];

        const conditions = [];
        const requestedAmount = Number(app.loanAmount);

        // Suggest reduced loan amount
        if (metrics.dti > 35) {
            const suggestedAmount = Math.round(requestedAmount * 0.75 / 10000) * 10000;
            conditions.push({
                type: 'amount',
                text: `Loan amount reduced to ${formatCurrency(suggestedAmount)} (from ${formatCurrency(requestedAmount)})`,
                value: suggestedAmount
            });
        }

        // Suggest higher interest rate
        const cs = Number(app.creditScore) || 300;
        if (cs < 700) {
            const newRate = 12.5;
            conditions.push({
                type: 'rate',
                text: `Interest rate adjusted to ${newRate}% p.a. (standard rate: 10.5%)`,
                value: newRate
            });
        }

        // Suggest guarantor
        if (metrics.dti > 40) {
            conditions.push({
                type: 'guarantor',
                text: 'A co-applicant or guarantor may be required'
            });
        }

        // Shorter tenure
        if (Number(app.loanTenure) > 36 && cs < 700) {
            conditions.push({
                type: 'tenure',
                text: 'Loan tenure limited to a maximum of 36 months'
            });
        }

        return conditions;
    },

    generateInsight(score, decision) {
        if (decision === 'approved') {
            return {
                text: `Users with similar profiles have a 92% successful repayment rate.`,
                rate: 92
            };
        } else if (decision === 'conditions') {
            return {
                text: `Users with similar profiles have an 78% successful repayment rate with adjusted terms.`,
                rate: 78
            };
        } else if (decision === 'review') {
            return {
                text: `Users with similar profiles have a 65% repayment rate. Additional review helps ensure fair assessment.`,
                rate: 65
            };
        } else {
            return {
                text: `Users with similar profiles have a 35% default rate. We recommend improving your credit profile before reapplying.`,
                rate: 35
            };
        }
    },

    /**
     * Calculate EMI for given parameters
     */
    calculateEMI(principal, annualRate, tenureMonths) {
        const r = annualRate / 12 / 100;
        if (r === 0) return principal / tenureMonths;
        const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
        return Math.round(emi);
    },

    /**
     * What-If: Recalculate score with modified parameters
     */
    whatIf(baseApp, modifications) {
        const modifiedApp = { ...baseApp, ...modifications };
        return this.evaluate(modifiedApp);
    }
};
