const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const ImageModule = require('docxtemplater-image-module-free');
const mammoth = require('mammoth');

const args = process.argv.slice(2);
if (args.length < 1) {
    console.error("Missing input JSON path");
    process.exit(1);
}

const inputPath = args[0];
const inputStr = fs.readFileSync(inputPath, 'utf8');
const { templatePath, outputPath, templateId, data } = JSON.parse(inputStr);

try {
    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
        let docXml = docXmlFile.asText();
        docXml = docXml.replace(/<w:highlight[^>]*\/>/g, '');
        docXml = docXml.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (match, inner) => {
            inner = inner.replace(/<w:shd[^>]*\/>/g, '');
            inner = inner.replace(/<w:color[^>]*\/>/g, '');
            return `<w:rPr>${inner}</w:rPr>`;
        });

        let isAlmFullBodyInjected = false;
        if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
            docXml = docXml.replace(
                /(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/,
                '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>'
            );
            isAlmFullBodyInjected = true;
        }

        if (!docXml.includes('fullBodyPhoto') && !isAlmFullBodyInjected) {
            const fullBodyInjection = `
              <w:p><w:r><w:br w:type="page"/></w:r></w:p>
              <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%fullBodyPhoto}</w:t></w:r></w:p>
            `;
            docXml = docXml.replace('</w:body>', fullBodyInjection + '</w:body>');
        }

        if (!docXml.includes('passport image') && !docXml.includes('passportPhoto')) {
            const passportInjection = `
              <w:p><w:r><w:br w:type="page"/></w:r></w:p>
              <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%passport image}</w:t></w:r></w:p>
            `;
            docXml = docXml.replace('</w:body>', passportInjection + '</w:body>');
        }

        docXml = docXml.replace(/<w:r>([\s\S]*?)<\/w:r>/g, (match, inner) => {
            if (inner.includes('{') || inner.includes('}')) {
                inner = inner.replace(/<w:rFonts[^>]*\/>/g, '');
                inner = inner.replace(/<w:sz[^>]*\/>/g, '');
                inner = inner.replace(/<w:szCs[^>]*\/>/g, '');
                const fontStyles = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/>';
                if (inner.includes('<w:rPr>')) {
                    inner = inner.replace('<w:rPr>', '<w:rPr>' + fontStyles);
                } else {
                    inner = inner.replace('<w:t', '<w:rPr>' + fontStyles + '</w:rPr><w:t');
                }
            }
            return `<w:r>${inner}</w:r>`;
        });

        zip.file('word/document.xml', docXml);
    }

    const imageOptions = {
        centered: false,
        getImage: (tagValue) => {
            if (!tagValue) return Buffer.from('');
            return Buffer.from(tagValue, 'base64');
        },
        getSize: (img, tagValue, tagName) => {
            if (tagName === 'facePhoto' || tagName === 'photo') return [150, 180];
            if (tagName === 'fullBodyPhoto') {
                if (templateId === 'tmpl-alm') return [350, 545];
                return [550, 750];
            }
            if (tagName === 'passport image' || tagName === 'passportPhoto') return [550, 750];
            return [150, 150];
        },
    };

    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOptions)],
    });

    doc.render(data);

    const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(outputPath, docxBuf);

    mammoth.convertToHtml({ buffer: docxBuf }).then(result => {
        const htmlOutputPath = outputPath.replace('.docx', '.html');
        fs.writeFileSync(htmlOutputPath, result.value);
        process.exit(0);
    }).catch(err => {
        console.error("Mammoth Error:", err);
        process.exit(1);
    });

} catch (error) {
    if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors.map(e => `${e.name}: ${e.message}`).join(' | ');
        console.error('Template Syntax Error:', errorMessages);
    } else {
        console.error(error);
    }
    process.exit(1);
}
