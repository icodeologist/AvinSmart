package models

type Category struct {
	ID            uint          `gorm:"primaryKey;column:id" json:"id"`
	Name          string        `gorm:"column:name;type:varchar(120);not null;uniqueIndex" json:"name"`
	Type          string        `gorm:"column:type;type:varchar(30);not null;default:product" json:"type"`
	SubCategories []SubCategory `gorm:"foreignKey:CategoryID" json:"sub_categories,omitempty"`
	CreatedAt     int64         `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt     int64         `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (Category) TableName() string {
	return "categories"
}

type SubCategory struct {
	ID         uint     `gorm:"primaryKey;column:id" json:"id"`
	CategoryID uint     `gorm:"column:category_id;not null;index;uniqueIndex:idx_sub_categories_category_name" json:"category_id"`
	Category   Category `gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"category"`
	Name       string   `gorm:"column:name;type:varchar(120);not null;uniqueIndex:idx_sub_categories_category_name" json:"name"`
	CreatedAt  int64    `gorm:"column:created_at;autoCreateTime" json:"created_at"`
	UpdatedAt  int64    `gorm:"column:updated_at;autoUpdateTime" json:"updated_at"`
}

func (SubCategory) TableName() string {
	return "sub_categories"
}
