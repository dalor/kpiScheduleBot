const http = require('http')
const url_parser = require('url')
const querystring = require('querystring');
const DOMParser = require('xmldom').DOMParser;

const hostname = 'rozklad.kpi.ua'

const ShowHiddenValues = (funct, errfunct) => {
    const options = {
        hostname: hostname,
        path: '/Schedules/ScheduleGroupSelection.aspx',
        method: 'GET'
      };
    http.request(options, (res) => {
        let page = '';
        res.on('data', (chunk) => {
            page += chunk;
        });
        res.on('end', () => {
            const doc = new DOMParser().parseFromString(page);
            const __VIEWSTATE = doc.getElementById('__VIEWSTATE');
            const __EVENTVALIDATION = doc.getElementById('__EVENTVALIDATION');
            if (__VIEWSTATE && __EVENTVALIDATION) {
                const hidden_values = {
                    '__VIEWSTATE': __VIEWSTATE.getAttribute('value'),
                    '__EVENTVALIDATION': __EVENTVALIDATION.getAttribute('value')
                };
                funct(hidden_values);
            }
            else {
                errfunct();
            }
        })
    }).end();
}

const ShowScheduleUrl = (group, type, hidden_values, funct) => {
    hidden_values.ctl00$MainContent$ctl00$txtboxGroup = group;
    hidden_values.ctl00$MainContent$ctl00$btnShowSchedule = type;
    const postData = querystring.stringify(hidden_values);
    const options = {
        hostname: hostname,
        path: '/Schedules/ScheduleGroupSelection.aspx',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
    const req = http.request(options, (res) => {
        if (res.headers.location) {
            const rurl = url_parser.parse(res.headers.location);
            rurl.hostname = hostname;
            funct(rurl);
        }
        else {
            funct(null);
        }
    })
    req.write(postData);
    req.end();  
}

const OptimizeValue = (element) => {
    const as = element.getElementsByTagName('a');
    if (as.length) {
        const res = {
            subject: {text: as[0].textContent,
                 url: as[0].getAttribute('href')},
            teachers: [],
            places: []
        } 
        for (let i = 1; i < as.length; i++){
            const url = as[i].getAttribute('href');
            const item = {
                text: as[i].textContent,
                url: url
            }
            if (url.startsWith('/Schedules/ViewSchedule.aspx')){
                item.url = `http://${hostname}${item.url}`;
                res.teachers.push(item);
            }
            else {
                res.places.push(item);
            }
        }
        return res;        
    }
    else {
        return null;
    }
}

const ParseWeek = (table) => {
    const table_rows = table.getElementsByTagName('tr');
    const result = [[], [], [], [], [], []];
    for (let r = 1; r <= 5; r++){
        const row = table_rows[r].getElementsByTagName('td');
        for (let d = 1; d <= 6; d++){
            result[d-1][r-1] = OptimizeValue(row[d]);
        }
    }
    return result;
}

const ParseTables = (url, funct) => {
    http.request(url, (res) => {
        let page = '';
        res.on('data', (chunk) => {
            page += chunk;
        })
        res.on('end', () => {
            const doc = new DOMParser({errorHandler: {warning: () => {}}}).parseFromString(page); //We need less warnings
            funct(
                ParseWeek(doc.getElementById('ctl00_MainContent_FirstScheduleTable')),
                ParseWeek(doc.getElementById('ctl00_MainContent_SecondScheduleTable'))
            );          
        })
    }).end();
}

module.exports = (group, funct, error) => {
    ShowHiddenValues((hidden_values) => {
        ShowScheduleUrl(group, 'Розклад занять', hidden_values, (url) => {
            if (url) {
                ParseTables(url, (first, second) => {
                    funct(first, second);
                });
            }
            else {
                error();
            }
        });
    }, error);
}

