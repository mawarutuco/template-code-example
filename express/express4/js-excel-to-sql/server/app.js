"use strict";
const env = require("dotenv").config();
const express = require("express");
const app = express();
const parseExcel = require("./xlsx/index");
const { addMonth } = require("./helper/date-parser");
const cors = require("cors");
app.use(cors());

const mysql = require("mysql");

const { user, password, host, port, database } = process.env;
const conn = mysql.createConnection({
  user,
  password,
  host,
  port,
  database,
});

conn.connect(function (err) {
  console.log(err ? err : "DB連線成功");
});

// 從 excel 取得
app.get("/excel/mobile", express.json(), async function (req, res) {
  try {
    const excelPath = "../excel/APPLEPAY/2022.xlsx";
    const sheetsName = "5月";
    const limit = 15;
    //   function 可以傳 [檔案路徑 資料表名稱 限制limit筆數]
    const data = await parseExcel(excelPath, sheetsName, limit);
    return res.send(data);
  } catch (error) {
    return res.send(error);
  }
});

app.get("/status/:year/:month", express.json(), function (req, res) {
  try {
    const params = req.params;
    const { year, month } = params;
    if (isNaN(Number(year)) || isNaN(Number(month))) {
      return res.send("請注意格式 ex: /data/2022/03");
    }
    let ans = {};

    const min = addMonth(`${year}-${month}-01`, 0);
    const max = addMonth(min, 1);
    const cashSql = `SELECT COUNT(id) as 'rows',SUM(款項金額) as 'sum' FROM cash WHERE 結帳時間 BETWEEN '${min}' AND '${max}';`;
    const mobileSql = `SELECT COUNT(id) as 'rows',SUM(款項金額) as 'sum' FROM mobile WHERE 結帳時間 BETWEEN '${min}' AND '${max}';`;

    conn.query(cashSql, [], (err, data) => {
      console.log(cashSql);
      if (err) {
        console.log(err);
        return res.send({});
      } else {
        const { rows, sum } = data[0];
        if (rows) {
          ans.cash = { rows, sum };

          conn.query(mobileSql, [], (err, data) => {
            console.log(mobileSql);
            if (err) {
              console.log(err);
              return res.send([]);
            } else {
              const { rows, sum } = data[0];
              if (rows) {
                ans.mobile = { rows, sum };
                return res.send(ans);
              }
            }
          });
        } else {
          return res.send({});
        }
      }
    });
  } catch (error) {
    return res.send(error);
  }
});

app.post("/orders", express.json(), async function (req, res) {
  try {
    const body = req.body;
    const { cash = [], mobile = [] } = body;
    let ans = {
      cash: [],
      mobile: [],
    };
    let sql = "id=1";
    // mobile
    if (mobile.length > 0) {
      sql = "id=" + mobile.join(" or id=");
      ans.mobile.push(...(await getData(sql, "mobile")));
    }
    if (cash.length > 0) {
      sql = "id=" + cash.join(" or id=");
      ans.cash.push(...(await getData(sql, "cash")));
    }
    // cash

    return res.send(ans);
  } catch (error) {
    console.log(error);
    return res.send(error);
  }
});

function getData(sql, tableName) {
  return new Promise((resolve, reject) => {
    let SQL = `SELECT * FROM ${tableName} WHERE ${sql};`;
    const limit = 5;
    console.log(SQL);
    conn.query(SQL, [limit], (err, data) => {
      if (err) {
        return reject({});
      }

      return resolve(data);
    });
  });
}

const { randomGetRowAlgorithm } = require("./helper/rate");
app.post("/random", express.json(), function (req, res) {
  try {
    const params = req.body;
    const { year, month, index, monthPrice, mobilePercent, ratio } = params;
    const cashPercent = 100 - mobilePercent;
    // 先用 cash
    let prices = (monthPrice * cashPercent) / 100;
    let mode = randomGetRowAlgorithm("cash");

    let ans = { index };

    const y_m = addMonth(`${year}-${month}`, 0, "no_date");
    console.log(y_m);
    if (!y_m) {
      return res.send("請注意格式 ex: /data/2022/03");
    }
    let tableName = "cash";
    let SQL = `
    SELECT NULL AS id, NULL AS 款項金額, NULL AS total
    FROM dual
    WHERE (@total := 0)
    UNION
    
    SELECT id, 款項金額, @total := @total + 款項金額 AS total
    FROM ${tableName}
    WHERE @total < ${
      prices * 1
    } AND 款項金額<160 AND 款項金額>24 AND  DATE_FORMAT(結帳時間,'%Y-%m') = '${y_m}'  ${mode} 
    LIMIT 1000000 OFFSET ${Math.floor(Math.random() * 1000)};
    `;

    conn.query(SQL, [], (err, data) => {
      console.log(SQL);
      if (err) {
        console.log(err);
        return res.send([]);
      } else {
        if (data.length > 0) {
          ans.cash = data;
          ans.cashTotal = data[data.length - 2].total;
          // 再用 mobile
          tableName = "mobile";
          mode = randomGetRowAlgorithm("mobile");
          prices = (monthPrice * mobilePercent) / 100;
          let SQL = `
          SELECT NULL AS id, NULL AS 款項金額, NULL AS total
          FROM dual
          WHERE (@total := 0)
          UNION
          
          SELECT id, 款項金額, @total := @total + 款項金額 AS total
          FROM ${tableName}
          WHERE @total < ${
            prices * 1
          } AND 款項金額<150 AND 款項金額>24  AND DATE_FORMAT(結帳時間,'%Y-%m') = '${y_m}' ${mode}
          LIMIT 1000000 OFFSET ${Math.floor(Math.random() * 1000)};
          `;
          conn.query(SQL, [], (err, data) => {
            console.log(SQL);
            if (err) {
              console.log(err);
              return res.send([]);
            } else {
              ans.mobile = data;
              ans.mobileTotal = data[data.length - 2].total;
              return res.send(ans);
            }
          });
        } else {
          return res.send([]);
        }
      }
    });
  } catch (error) {
    return res.send(error);
  }
});

/** 搬移交易紀錄API */
// INSERT INTO cash_official SELECT * FROM cash WHERE id = 1; // 複製過去新表格但是沒有刪除
// DELETE FROM cash WHERE id=3;  //刪除
// mobile mobile_official
// cash cash_official
// API 搬移
/**
 * 找不到id 不做 記錄起來
 * {
 *  message: 'ok',
 *  table: 'mobile',
 *  mode: '倉庫=>正式區',
 *  success:[1,2,3],
 *  fails: []
 * }
 *
 * {
 *  message: 'wrong id',
 *  table: 'cash',
 *  mode: '正式區=>倉庫',
 *  success:[],
 *  fails: [1,2,3]
 * }
 */

function handleDB(sql) {
  return new Promise((resolve, reject) => {
    console.log(sql);
    conn.query(sql, [], (err, data) => {
      if (err) {
        return reject({ err });
      }

      return resolve(data);
    });
  });
}
app.post("/moveData/:a/:b", express.json(), async function (req, res) {
  try {
    const params = req.params;
    const body = req.body;
    const ids = body.id; //arr
    let condition = "";
    if (ids?.length > 0) {
      condition = "WHERE id = " + ids.join(" OR id = ");
    }
    let ans = {
      mode: `${params.a}=>${params.b}`,
      copyCounter: 0,
      deleteCounter: 0,
      id: ids,
      condition,
    };
    if (condition === "") {
      return res.send(ans);
    }
    let copySQL = `INSERT INTO ${params.b}  SELECT * FROM ${params.a}  ${condition};`;
    const copy = await handleDB(copySQL);
    if (copy) {
      ans.copyCounter++;
    } else {
      ans.copyCounter--;
    }

    let deleteSQL = `DELETE FROM ${params.a}  ${condition};`;
    const del = await handleDB(deleteSQL);
    if (del) {
      ans.deleteCounter++;
    } else {
      ans.deleteCounter--;
    }
    return res.send(ans);
  } catch (error) {
    console.log(error);
    return res.send(error);
  }
});

app.listen(3011, () => console.log("http://localhost:3011/"));
