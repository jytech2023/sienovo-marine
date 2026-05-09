# Sienovo Marine · 运维：船只 Provisioning

**仅云端运维内部使用**。硬件组不应看到这份文档（含 AWS account / IAM / CLI 操作细节）。

每艘新船 4-5 个 AWS CLI 命令。所有命令必须带 `--profile sienovo-iot --region ap-east-1`（缺 region 会报 `NoRegion`）。

## 开新船

```bash
THING=BOAT-XYZ              # 新船的 thing name
PROFILE=sienovo-iot
REGION=ap-east-1
mkdir -p .aws-iot-out && cd .aws-iot-out

# 1. 注册 thing
aws iot create-thing \
  --thing-name "$THING" --thing-type-name sienovo-boat \
  --profile $PROFILE --region $REGION

# 2. 创建证书 + 公私钥
aws iot create-keys-and-certificate --set-as-active \
  --certificate-pem-outfile "$THING.cert.pem" \
  --public-key-outfile      "$THING.public.key" \
  --private-key-outfile     "$THING.private.key" \
  --profile $PROFILE --region $REGION \
  > "$THING.cert-meta.json"

CERT_ARN=$(jq -r .certificateArn "$THING.cert-meta.json")

# 3. 绑 IoT policy 到证书
aws iot attach-policy --policy-name sienovo-boat-dev-policy --target "$CERT_ARN" \
  --profile $PROFILE --region $REGION

# 4. 绑证书到 thing（让 ${iot:Connection.Thing.ThingName} 能解析）
aws iot attach-thing-principal --thing-name "$THING" --principal "$CERT_ARN" \
  --profile $PROFILE --region $REGION

# 5. (一次性) Amazon root CA — 所有船共用
[ -f AmazonRootCA1.pem ] || curl -sS https://www.amazontrust.com/repository/AmazonRootCA1.pem -o AmazonRootCA1.pem

echo "✓ provisioned $THING"
echo "  发给硬件组: $THING.cert.pem  $THING.private.key  AmazonRootCA1.pem"
echo "  自留备查:    $THING.cert-meta.json (含 cert ARN)"
```

## 撤销 / 退役

```bash
THING=BOAT-XYZ
PROFILE=sienovo-iot
REGION=ap-east-1

# 1. 找 cert ARN
CERT_ARN=$(aws iot list-thing-principals --thing-name $THING \
  --profile $PROFILE --region $REGION --query 'principals[0]' --output text)
CERT_ID=${CERT_ARN##*/}

# 2. 注销证书
aws iot update-certificate --certificate-id $CERT_ID --new-status REVOKED \
  --profile $PROFILE --region $REGION
aws iot detach-thing-principal --thing-name $THING --principal "$CERT_ARN" \
  --profile $PROFILE --region $REGION
aws iot delete-certificate --certificate-id $CERT_ID \
  --profile $PROFILE --region $REGION
aws iot delete-thing --thing-name $THING \
  --profile $PROFILE --region $REGION
```

## 给硬件组的交付物

每艘船打包以下三件：

```
BOAT-XXXX.cert.pem         # 客户端证书
BOAT-XXXX.private.key      # 私钥（务必走加密渠道，过期 / 失窃即按下面 revoke）
AmazonRootCA1.pem          # broker 端根 CA，所有船共用
```

**禁止**给硬件组：
- `BOAT-XXXX.public.key` — 多余文件（公钥已嵌在 cert.pem 里）
- `BOAT-XXXX.cert-meta.json` — 内部 cert ARN / ID 档案，仅用作 revoke / 审计
- IAM access key、AWS account ID、profile 配置 — 一律不出

**一船一证**：每台真实硬件必须有自己独立的 thing + cert，**不要让多台船共用同一对 cert/key**。原因：IoT policy 里的 `${iot:Connection.Thing.ThingName}` 按 client ID 解析，多台用同一 client ID 时只有一台能在线，后到的会被踢。量产 N 台船 = 跑 N 次开船流程。

## 已存在的资源（v1 上线时建的）

| 资源 | 名称 |
|---|---|
| Region | `ap-east-1` |
| Broker endpoint | `a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com` |
| Thing Type | `sienovo-boat` |
| IoT Policy（船端） | `sienovo-boat-dev-policy` |
| Cognito Identity Pool（dashboard） | `ap-east-1:94175a79-f33f-48c1-89f3-fc79288207f0` |
| Unauth role | `sienovo-marine-viewer-unauth` |
| 已 provisioned things | `BOAT-A3F8` |

更动这些资源前先和工程组同步，硬件证书是绑在策略上的。
