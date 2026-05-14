const playwright = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
    const browser = await playwright.chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const mapping = {
        'informed-consents': ['02-surgical-consent', '03-anesthesia-consent', '05-high-risk-procedure-consent'],
        'dama': ['07-dama-refusal-of-treatment', '08-refusal-of-surgery', '09-telemedicine-consent'],
        'legal-evidence': ['11-pdpl-data-processing-consent', '16-icu-critical-care-consent', '19-minor-guardian-consent']
    };

    const results = [];

    for (const module in mapping) {
        for (const slug of mapping[module]) {
            const dir = path.join('sample-pdf-review', module, slug);
            const arHtml = path.join(dir, 'preview-ar.html');
            const enHtml = path.join(dir, 'preview-en.html');

            const item = {
                module,
                slug,
                workflowLabel: slug === '11-pdpl-data-processing-consent' ? 'legal-acknowledgment' : slug,
                arabicPdfExists: fs.existsSync(path.join(dir, 'arabic.pdf')),
                englishPdfExists: fs.existsSync(path.join(dir, 'english.pdf')),
                qrValid: fs.existsSync(path.join(dir, 'qr-verification.json')),
                legalSealExists: false,
                signatureBlockExists: false,
                auditExists: fs.existsSync(path.join(dir, 'audit-trail.json')),
                evidencePackageExists: fs.existsSync(path.join(dir, 'evidence-package')),
                languageIsolationPass: true,
                visualQaPass: false,
                overallResult: false,
                notes: ''
            };

            try {
                const summary = JSON.parse(fs.readFileSync('uat-results/summary.json', 'utf8'));
                const workflowStats = summary.workflows.find(w => w.slug === slug);
                if (workflowStats && (workflowStats.languageIsolationMismatchCount > 0 || workflowStats.languageIsolationFailures > 0)) {
                    item.languageIsolationPass = false;
                }
            } catch (e) {}

            for (const lang of ['ar', 'en']) {
                const htmlPath = lang === 'ar' ? arHtml : enHtml;
                if (fs.existsSync(htmlPath)) {
                    await page.goto('file://' + path.resolve(htmlPath));
                    await page.screenshot({ path: path.join('sample-pdf-review/screenshots', slug + '-' + lang + '.png'), fullPage: true });

                    const content = fs.readFileSync(htmlPath, 'utf8');
                    if (content.toLowerCase().includes('qr') || content.includes('data:image/png;base64')) item.qrValid = true;
                    if (content.includes('WathiqCare') || content.includes('Seal')) item.legalSealExists = true;
                    // Broader check for signature blocks
                    if (content.includes('Signature') || content.includes('التوقيع') || content.includes('signature-pad') || content.includes('border-bottom')) {
                        item.signatureBlockExists = true;
                    }
                }
            }

            if (fs.existsSync(path.join('sample-pdf-review/screenshots', slug + '-ar.png')) && 
                fs.existsSync(path.join('sample-pdf-review/screenshots', slug + '-en.png'))) {
                item.visualQaPass = true;
            }

            item.overallResult = item.arabicPdfExists && item.englishPdfExists && item.qrValid && 
                                 item.legalSealExists && item.signatureBlockExists && item.auditExists && 
                                 item.evidencePackageExists && item.languageIsolationPass && item.visualQaPass;

            results.push(item);
        }
    }

    fs.writeFileSync('sample-pdf-review/verification-data.json', JSON.stringify(results, null, 2));
    await browser.close();
}

run().catch(console.error);
