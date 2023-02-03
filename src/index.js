import express from "express";
import bodyParser from "body-parser";
import "dotenv/config";

const port = process.env.PORT || 5000;
const app = express();
app.use(bodyParser.json());

const ACCOUNT_ID = process.env.ACCOUNT_ID;
const NAMESPACE = process.env.NAMESPACE;
const X_AUTH_EMAIL = process.env.X_AUTH_EMAIL;
const X_AUTH_KEY = process.env.X_AUTH_KEY;

const apiBase = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE}/keys`;
const headers = {
  "X-Auth-Email": X_AUTH_EMAIL,
  "X-Auth-Key": X_AUTH_KEY,
  "Content-Type": "application/json",
};

app.get("/:id", async (req, res) => {
  const { id } = req.params;
  const keysToFind = id;

  try {
    const keysResponse = await fetch(apiBase, {
      headers,
    });
    const keysData = await keysResponse.json();
    const keys = keysData.result;

    const values = await Promise.all(
      keys.map(async (key) => {
        const valueResponse = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE}/values/${key.name}`,
          {
            headers,
          }
        );

        const valueData = await valueResponse.json();
        return { key: key.name, value: valueData };
      })
    );
    let responseData = values.reduce((prev, cur) => {
      const key = cur.key;
      const findTrends = cur.value.find(
        (obj) => Object.keys(obj)[0] === keysToFind
      );
      prev = [...prev, { key, value: findTrends }];
      return prev;
    }, []);
    responseData.sort((a, b) => {
      return new Date(a.key).getTime() - new Date(b.key).getTime();
    });
    res.status(200).json(responseData);
  } catch (err) {
    res.status(400).send("Bad Request");
  }
});

app.listen(port);