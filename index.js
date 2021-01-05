const _ = require('lodash');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const authorName = 'Юра Синишин';
const getEndMonth = (currentMonthNumberFromZero) => currentMonthNumberFromZero - 1;// currentMonthNumberFromZero - 0 => include current month
const getStartMonth = (currentMonthNumberFromZero) => currentMonthNumberFromZero - 2;// currentMonthNumberFromZero - 2 => include two previous months
const inputDir = 'input';
const outputDir = 'output'

const inputDirPath = path.resolve(__dirname, inputDir)
const outputDirPath = path.resolve(__dirname, outputDir)
const createDir = (path) => fs.existsSync(path) || fs.mkdirSync(path)
createDir(inputDirPath);
createDir(outputDirPath);

const processDoc = (docName) => {
  const setTag = (text, tag, value, xmlTags) => text.replace(new RegExp(`<${_.escapeRegExp(tag)}.*>.*</${_.escapeRegExp(tag)}>`, 'ig'), `<${tag}${xmlTags ? ` ${xmlTags}` : ''}>${value}</${tag}>`);
  const setTags = (text, tags) => Object.entries(tags).reduce((acc, [tag, value]) => setTag(acc, tag, value.value || value, value.xmlTags), text);
  const content = fs.readFileSync(path.resolve(inputDirPath, docName), 'binary');
  const zip = new PizZip(content);

  const wrapFile = (fileName, fn) => {
    const original = zip.files[fileName].asText;
    zip.files[fileName].asText = function () {
      const value = fn(original.apply(this));
      // console.log(value);
      return value;
    };
  };
  function randomIntFromInterval(f, s) { // min and max included
    const min = Math.min(f, s);
    const max = Math.max(f, s);
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  const randomTime = (m) => {
    m.set('hour', randomIntFromInterval(11, 23));
    m.set('minute', randomIntFromInterval(1, 59));
    m.set('second', randomIntFromInterval(1, 59));
    m.set('millisecond', randomIntFromInterval(1, 999));
    return m;
  };
  const randomDate = () => {
    const m = moment();
    const currentMonth = m.get('month');
    const currentDay = m.get('month');
    m.set('month', randomIntFromInterval(getStartMonth(m.get('month')), getEndMonth(m.get('month'))));
    m.set('date', randomIntFromInterval(1, Math.min((m.get('month') === currentMonth) ? currentDay - 2 : 27), 1));
    randomTime(m);
    return m;
  };
  // debugger;
  wrapFile('docProps/app.xml', (text) => setTags(text, { TotalTime: randomIntFromInterval(130, 300), Manager: '', Company: '' }));
  const created = randomDate();
  const modified = randomTime(moment(created).add(randomIntFromInterval(1, 5), 'day'));
  // console.log(created.toISOString(), modified.toISOString())
  wrapFile('docProps/core.xml', (text) => setTags(text, {
    'dc:creator': authorName,
    'cp:lastModifiedBy': authorName,
    'dcterms:created': { value: created.toISOString(), xmlTags: 'xsi:type="dcterms:W3CDTF"' },
    'dcterms:modified': { value: modified.toISOString(), xmlTags: 'xsi:type="dcterms:W3CDTF"' },
  }));

  const doc = new Docxtemplater(zip);
  doc.render();
  const buf = doc.getZip().generate({ type: 'nodebuffer' });

  fs.writeFileSync(path.resolve(outputDirPath, docName), buf);
};
const App = async () => {
  (async () => {
    fs.readdirSync(path.resolve(inputDirPath)).forEach((filename) => {
      if (filename.includes('doc')) processDoc(filename);
    });
  })();
};
App();